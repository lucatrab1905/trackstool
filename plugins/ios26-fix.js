/**
 * Expo config plugin: ios26-fix
 *
 * Adds a Podfile post_install hook that patches RCTTurboModule.mm after
 * CocoaPods installs it, right before Xcode compiles it.
 *
 * Root cause of the iOS 26 crash:
 *   ObjCTurboModule::performVoidMethodInvocation catches an NSException and
 *   re-throws it as a C++ jsi::JSError from within an @catch block.
 *   On iOS 26, this triggers objc_exception_rethrow -> __cxa_rethrow ->
 *   _objc_terminate() -> SIGABRT on com.meta.react.turbomodulemanager.queue.
 *
 * Fix: replace the throw with NSLog to swallow the exception safely.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const MARKER = '# ios26-fix';

// Ruby snippet written into the Podfile.
// Note: "\\n" in this JS template literal becomes "\n" in the file,
// which Ruby double-quoted strings interpret as a newline character.
const PODFILE_HOOK = `
${MARKER}
post_install do |installer|
  target = File.join(File.dirname(__dir__), 'node_modules', 'react-native', 'ReactCommon', 'react', 'nativemodule', 'core', 'platform', 'ios', 'ReactCommon', 'RCTTurboModule.mm')
  next unless File.exist?(target)
  src = File.read(target)
  next if src.include?('[iOS26Fix]')
  original = '    } @catch (NSException *exception) {' + "\\n" + '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);' + "\\n" + '    } @finally {'
  patched  = '    } @catch (NSException *exception) {' + "\\n" + '      NSLog(@"[iOS26Fix] exception in void method %s.%s: %@", moduleName, methodName, exception);' + "\\n" + '    } @finally {'
  if src.include?(original)
    File.write(target, src.sub(original, patched))
    puts "ios26-fix: Patched RCTTurboModule.mm for iOS 26 compatibility"
  else
    puts "ios26-fix: WARNING - could not find patch target in RCTTurboModule.mm"
  end
end
`;

module.exports = function withIOS26Fix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (!fs.existsSync(podfilePath)) {
        return config;
      }

      let content = fs.readFileSync(podfilePath, 'utf8');

      if (content.includes(MARKER)) {
        return config;
      }

      fs.writeFileSync(podfilePath, content + PODFILE_HOOK);
      return config;
    },
  ]);
};
