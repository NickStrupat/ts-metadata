Push-Location
try {
    Set-Location $PSScriptRoot/sample
    tsc --target es6 --module commonjs $PSScriptRoot/../../src/generate.ts
    node $PSScriptRoot/../../src/generate.js
}
finally {
    Pop-Location
}