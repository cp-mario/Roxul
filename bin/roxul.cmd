@echo off
:: Wrapper script for Roxul CLI on Windows
set "SCRIPT_DIR=%~dp0"
node "%SCRIPT_DIR%..\cli.js" %*