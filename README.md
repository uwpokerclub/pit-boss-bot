# pit-boss-bot


## Table of Contents
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Clone the repository](#clone-the-repository)
- [Configuration](#configuration)
- [Usage](#testing)
- [Migrations](#migrations)
- [Scripts](#scripts)
- [Contributing](#contributing)

## Installation
Before starting development or usage of the bot, ensure you have all of the prerequisite softwares installed below.

### Prerequisites
- [NodeJS](https://nodejs.org/en/)
- [TypeScript](https://www.typescriptlang.org)


### Clone the repository
Clone the repository to your local development environment using:

```sh
# HTTPS
git clone https://github.com/uwpokerclub/pit-boss-bot.git
# SSH
git clone git@github.com:uwpokerclub/pit-boss-bot.git
# GH CLI
gh repo clone uwpokerclub/pit-boss-bot

# Change into project directory
cd pit-boss-bot
```

## Configuration 
Before building the application, create a configuration file `config.json` in the top level git directory (the same directory the file `config.example.json` resides). Copy the content of `config.example.json` into `config.json` and input the appropriated values needed for the application.


### Discord
Visit [Discord Developer portal](https://discord.com/developers/applications) to create an application. 

Click the `New Application` button.

#### discord.token
Navigate to the `Bot` menu found on the left side of the interface once you created the application. Click the blue button `Reset Token` and copy the new token.

#### discord.clientId
Navigate to the `OAuth2` menu found on the left side of the interface once you created the application. Under the Client Information section, you can find the clientId of the bot.

#### discord.guildId
Right click on the server you wish to invite the bot to and click the `Copy Server ID` option.

#### discord.verifiedRoleId
This is the id of the role the bot will assign to users after they verify their accounts.  

Create a role in the desired discord server, right click on the role in server setting and hit the `Copy Role ID` option to copy its ID.
Make sure the verified role you just created is placed **below** the your bot's role.

#### Additional information
Make sure the bot has the following permissions in the desired server:
- Manage Roles
- Send Messages
- Use Application Commands


### Brevo
Visit [Brevo](https://www.brevo.com) to create an account.

#### Brevo.brevoKey
After creating your account, click on your profile and navigate to the `SMTP & API` menu. Navigate to the `API Keys` submenu and create a new api key.

#### Brevo.verification_email_template_id
Contact an admin / contributor of the project for the template url and paste it into your browser. Click `Import this template`. You will be brought to an editing page. Do not modify anything. Hit `Save & quit` then `Save & Activate`. 
Navigate to the `Campaigns` menu from your dashboard, then into the `Templates` submenu. Find the template you just imported, and copy the number after "#" under the name of the template.

### UWPSC api
**_Note: You will also need to have the [API server](https://github.com/uwpokerclub/api) running locally as well._**

**uwpsc.uwpsc.apiUrl:** where the api is hosted.\
**cookieName:** the name of the authentication cookie. Likely going to be one of `uwpsc-session-id` or `uwpsc-dev-session-id`.\
**uwpsc.username & uwpsc.password:** login credentials.

### Misc
**logoUrl:** where the club's logo image is hosted.



## Development


### Building
```sh
tsc --build
```
Or alternatively,
```sh
npm run build
```


### Usage

To host the discord client on your local machine:
```sh
node dist/src/index.js
```
Or alternatively,
```sh
npm run start
```
Note that the second option cleans the build folder, rebuilds the program, and registers all commands to the designated guild before execution.


## Migrations
The sqlite schemas should be initialized automatically upon initial execution of the program.


## Scripts

### Manual command registration
To register the commands to designated guild manually, run this following terminal command after building the program:
```sh
node dist/src/scripts/deployCommands.js 
```


## Contributing
TBD

