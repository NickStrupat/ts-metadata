Push-Location
try {
    Set-Location sample
    tsc --target es6 --module commonjs ../../../src/generate.ts
    node ../../../src/generate.js
}
finally {
    Pop-Location
}