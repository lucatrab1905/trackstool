/**
 * postinstall.js
 *
 * Patches RCTTurboModule.mm to fix a crash on iOS 26 (beta).
 *
 * Root cause: throwing a C++ jsi::JSError from within an @catch block causes
 * objc_exception_rethrow -> __cxa_rethrow -> _objc_terminate() -> abort() on iOS 26.
 * The fix swallows the exception (logs it) instead of rethrowing, preventing SIGABRT.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(
  __dirname,
  'node_modules/react-native/ReactCommon/react/nativemodule/core/platform/ios/ReactCommon/RCTTurboModule.mm'
);

if (!fs.existsSync(filePath)) {
  console.log('postinstall: RCTTurboModule.mm not found, skipping patch.');
  process.exit(0);
}

let content = fs.readFileSync(filePath, 'utf8');

const original =
  '    } @catch (NSException *exception) {\n' +
  '      throw convertNSExceptionToJSError(runtime, exception, std::string{moduleName}, methodNameStr);\n' +
  '    } @finally {';

const patched =
  '    } @catch (NSException *exception) {\n' +
  '      // iOS 26 fix: throwing C++ from within @catch crashes via objc_exception_rethrow.\n' +
  '      // Swallow the exception to prevent SIGABRT on iOS 26 beta.\n' +
  '      NSLog(@"[RCTTurboModule] Exception in void method %s.%s: %@", moduleName, methodName, exception);\n' +
  '    } @finally {';

if (content.includes(patched)) {
  console.log('postinstall: RCTTurboModule.mm already patched.');
} else if (content.includes(original)) {
  const updated = content.replace(original, patched);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('postinstall: Patched RCTTurboModule.mm for iOS 26 compatibility.');
} else {
  console.warn('postinstall: WARNING - Could not find target code in RCTTurboModule.mm. Patch not applied.');
}
