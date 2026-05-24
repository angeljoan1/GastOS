import ts from "typescript";

const program = ts.createProgram([
  "components/modals/SharedWalletModal.tsx",
  "components/modals/SharedExpenseModal.tsx",
  "services/sharedWallets.ts",
  "components/dashboard/widgets/SharedWalletWidget.tsx"
], {
  noEmit: true,
  jsx: ts.JsxEmit.Preserve,
  esModuleInterop: true,
  strict: true
});

const allDiagnostics = ts.getPreEmitDiagnostics(program);
allDiagnostics.forEach(diagnostic => {
  if (diagnostic.file) {
    const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
  } else {
    console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  }
});
