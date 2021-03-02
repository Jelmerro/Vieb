@echo off

rem Script made by:
rem Henry++ @henrycpp
rem Jelmer van Arnhem @jelmerro
rem
rem Mostly based on this script by henrypp:
rem https://github.com/henrypp/chrlauncher/blob/master/bin/SetDefaultBrowser.bat
rem Online license of original:
rem https://github.com/henrypp/chrlauncher/blob/master/LICENSE
rem An offline copy of the license is included as "windows.LICENSE"

set "VIEB_NAME=vieb"
set "VIEB_NAME_SHORT=vieb"
set "VIEB_DESCRIPTION=Vieb - Vim Inspired Electron Browser"
rem Arguments consist of the full with executable path, optionally with spaces
rem All arguments are read below and used as the full path joined with spaces
set "VIEB_PATH=%*"
set "VIEB_ICON=\"%VIEB_PATH%\",0"
set "VIEB_ARGS=\"%VIEB_PATH%\" \"%%1\""

if not exist "%VIEB_PATH%" (
    echo ERROR: "%VIEB_PATH%" not found.
) else (
    reg add hklm /f>nul 2>&1
    if ERRORLEVEL 1 (
        echo ERROR: you have no privileges.
    ) else (
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%HTML" /v "" /t REG_SZ /d "%VIEB_NAME% Document" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%HTML\DefaultIcon" /v "" /t REG_SZ /d "%VIEB_ICON%" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%HTML\shell\open\command" /v "" /t REG_SZ /d "%VIEB_ARGS%" /f

        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL" /v "" /t REG_SZ /d "%VIEB_NAME% Protocol" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL" /v "EditFlags" /t REG_DWORD /d "2" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL" /v "FriendlyTypeName" /t REG_SZ /d "%VIEB_NAME% Protocol" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL" /v "URL Protocol" /t REG_SZ /d "" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL\DefaultIcon" /v "" /t REG_SZ /d "%VIEB_ICON%" /f
        reg add "HKLM\Software\Classes\%VIEB_NAME_SHORT%URL\shell\open\command" /v "" /t REG_SZ /d "%VIEB_ARGS%" /f

        reg add "HKLM\Software\RegisteredApplications" /v "%VIEB_NAME_SHORT%" /t REG_SZ /d "Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%" /v "" /t REG_SZ /d "%VIEB_NAME%" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\DefaultIcon" /v "" /t REG_SZ /d "%VIEB_ICON%" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\shell\open\command" /v "" /t REG_SZ /d "\"%VIEB_PATH%\"" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\InstallInfo" /v "IconsVisible" /t REG_DWORD /d "1" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities" /v "ApplicationIcon" /t REG_SZ /d "%VIEB_ICON%" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities" /v "ApplicationName" /t REG_SZ /d "%VIEB_NAME%" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities" /v "ApplicationDescription" /t REG_SZ /d "%VIEB_DESCRIPTION%" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".htm" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".html" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".pdf" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".shtml" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".svg" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".webp" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".xht" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\FileAssociations" /v ".xhtml" /t REG_SZ /d "%VIEB_NAME_SHORT%HTML" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\StartMenu" /v "StartMenuInternet" /t REG_SZ /d "%VIEB_NAME_SHORT%" /f

        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "ftp" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "http" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "https" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "mailto" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "webcal" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "urn" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "tel" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "smsto" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "sms" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "nntp" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "news" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "mms" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f
        reg add "HKLM\Software\Clients\StartMenuInternet\%VIEB_NAME_SHORT%\Capabilities\URLAssociations" /v "irc" /t REG_SZ /d "%VIEB_NAME_SHORT%URL" /f

        %windir%\system32\control.exe /name Microsoft.DefaultPrograms /page pageDefaultProgram\pageAdvancedSettings?pszAppName=%VIEB_NAME_SHORT%
    )
)
(goto) 2>nul & del "%~f0"
