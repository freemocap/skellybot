# Dev Onboarding

# Onboarding

Goal here is to get you onboard with the workflow of this project.


### 1. set up cli package manager
- install `chocolatey`, our general cli package manager
- instructions: https://chocolatey.org/
- can quickly check if it works- `Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`
- make sure to `choco upgrade chocolatey`

### 2. get connected to the gcloud instance (freemocap org only)
- ensure you have access to the skellybot project through your google cloud dev account (consult freemocap org)
- install `gcloud` from the terminal
- https://cloud.google.com/sdk/docs/install
- initialize it:
    - `gcloud init` - initializes the google cloud environment in your terminal
    - `gcloud auth login` - gets your google cloud command line authentication going
    - `gcloud auth application-default login` - sets up local dev authentication similar to the live version
    - each of these pops the browser open

### 3. install JetBrainsToolbox
- `choco install jetbrainstoolbox`
    - fallback: https://www.jetbrains.com/toolbox-app/
- install WebStorm
- install Writerside

### 5. setup Webstorm
- `ctrl+shift+S` to open Settings
- go to Plugins
    - GoogleCloudCode
    - Writerside
    - GitToolBox
    - optional:
        - Continue (ai assistant)
        - NestJS architecture view

### 6. clone the repo
- first, git prepared (ho ho hooo):
    - main project repo: https://github.com/freemocap/skellybot
    - you need either:
        - github credentials on the project (private/public keys, etc)
        - fork and work with your own version of the repo
            - make sure to switch to a new dev branch / make an upstream branch, etc
            - https://github.com/[your_username]/[your_skellybot_fork]
- `git clone [url]`
    -  or through whatever UI

### 7. install the project's dependencies
- simple, just run `npm install` from the root 