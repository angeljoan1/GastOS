const ts = require("typescript");
const fs = require("fs");

const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.json");
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, "./");

const program = ts.createProgram([
  "components/modals/SharedWalletModal.tsx",
  "components/modals/SharedExpenseModal.tsx",
  "services/sharedWallets.ts",
  "components/dashboard/widgets/SharedWalletWidget.tsx"
], parsedConfig.options);

const emitResult = program.emit();
const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    // Only print errors for our specific files to avoid noise from node_modules
    if (diagnostic.file.fileName.includes("components/modals") || 
        diagnostic.file.fileName.includes("services/sharedWallets") ||
        diagnostic.file.fileName.includes("components/dashboard")) {
        const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    }
  } else {
    // console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  }
});
