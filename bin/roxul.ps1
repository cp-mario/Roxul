# PowerShell wrapper for Roxul CLI
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
node "$scriptDir\..\cli.js" @Args