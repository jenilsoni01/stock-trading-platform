@REM ----------------------------------------------------------------------------
@REM Maven Wrapper Batch Script
@REM ----------------------------------------------------------------------------

@IF "%DEBUG%" == "" @ECHO OFF
@SETLOCAL ENABLEEXTENSIONS ENABLEDELAYEDEXPANSION

SET "DIR=%~dp0"
IF "%DIR:~-1%"=="\" SET "DIR=%DIR:~0,-1%"

SET "WRAPPER_JAR=%DIR%\.mvn\wrapper\maven-wrapper.jar"
SET "WRAPPER_PROP=%DIR%\.mvn\wrapper\maven-wrapper.properties"

IF NOT EXIST "%WRAPPER_PROP%" (
    ECHO Error: Could not find %WRAPPER_PROP%
    EXIT /B 1
)

IF NOT EXIST "%WRAPPER_JAR%" (
    ECHO Downloading Maven Wrapper...
    powershell -NoProfile -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/3.3.2/maven-wrapper-3.3.2.jar', '%WRAPPER_JAR%')"
    IF ERRORLEVEL 1 (
        ECHO Error downloading maven-wrapper.jar. Please verify internet connectivity.
        EXIT /B 1
    )
)

IF "%JAVA_HOME%" == "" (
    SET "JAVA_EXE=java.exe"
) ELSE (
    SET "JAVA_EXE=%JAVA_HOME%\bin\java.exe"
)

"%JAVA_EXE%" -Dmaven.multiModuleProjectDirectory="%DIR%" -jar "%WRAPPER_JAR%" %*
EXIT /B %ERRORLEVEL%
