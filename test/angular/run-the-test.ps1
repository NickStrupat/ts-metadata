Push-Location
try {
    Set-Location $PSScriptRoot/sample
    tsc --target es6 --module commonjs ../../../src/generate.ts
    node ../../../src/generate.js
}
finally {
    Pop-Location
}