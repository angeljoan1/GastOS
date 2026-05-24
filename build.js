const { execSync } = require('child_process');
try {
  const output = execSync('npm run build', { stdio: 'pipe', encoding: 'utf-8' });
  console.log(output);
} catch (error) {
  console.log('Build failed!');
  console.log(error.stdout);
  console.log(error.stderr);
}
