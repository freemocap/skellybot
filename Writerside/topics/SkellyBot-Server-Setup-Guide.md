# SkellyBot Server Setup Guide

(Note: SkellyBot is in closed alpha right now, meaning invites are being manually provided to folks by the devs. If you are interested in participating, send us a message at `info@freemocap.org`)

## Quick Start Instructions

### Step by Step
1. Click on the provided **Discord template server link**.
1Set up your server however you like.
1. Click on the provided **SkellyBot invite link**.
    1. Invite Skelly to your server

### Basic Usage
- Use `/chat` in any channel to start a conversation with SkellyBot.
- Send a voice memo to an active chat for automatic transcription.
- Right click any Message and select `Apps >> Open 'chat' Thread` to start a chat using that message as starting point

### NOTE
- Botto can't handle text attachments to message yet
- There's a bug that makes things break if the **Initial Message** of a chat is longer than the max discord message length (2000 characters), so keep the starting message short (or empty) for now. This'll be fixed soon. 


## Setting up your Server
### Hierarchical Context Instructions

When you make a new thread, the bot will create its `System Prompt` based on **Context Instructions** pulled from the following places (in order):
- **Server-wide Instructions**-Messages tagged with the 🤖 emoji in the `bot-instructions*` channel at the 'top level' of the server (i.e. outside of any category
  **- NOTE: You should definitely add something like "keep your answers short unless you have a reason to say more" or something to this channel**
- **Category-wide Instructions** - ditto for a `bot-instructions*` channel in the same Category as the channel where the `/chat` was sent  
- The `Description`/`Topic` of the channel where the `/chat` was sent
- Any messages tagged with the 🤖 emoji in the channel where the `/chat` was sent

That means that every time you make a new chat, the bot has  `hierarchically defined context instructions` configured at different levels:
- Server  (🤖-tagged-messages)
- Category  (🤖-tagged-messages)
- Channel (topic)
- Channel (🤖-tagged-messages)


The server templates comes pre-configured with a server-level `bot-instructions` channel and another category-level bot- instructions channel. You can replicate this structure in other categories.

Try making one category for each Project or Area of Interest, and different channels for different aspects/sub-projects of that category. 


