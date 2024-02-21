# Project Server Structure

## 📂📄 - Server Structure: Folders and Documents
Think of the server as **hierarchically organized text**, the same way a **folder tree** is where you store **document files** on a standard computer. 

## 📂 The "folders"
**server** -
- / **category**
  - / **channel** -- where chatting starts to happen, between you and me, or just your own notes
    - / **thread** -- conversations that pop up INSIDE channels. AI chats are **always ** contained to threads.

## 📄 The "documents": Messages are just wrappers for Markdown Documents
The **contents** of these "folders" are the `messages`. Yes, when we're just chatting we keep these short, but ultimately they are `documents`. They **render** *all* __sorts__ of `markdown`
## including 
### headings
- and
  - bullet points. 
```
and code blocks
```
Check out https://www.markdownguide.org/cheat-sheet/. 

This is why we're not really using external tools-- everything you write in `markdown` can be translated to google docs, or word, or latex, or html, or whatever you want. Just write it here.

## Categories are Your Workspace
- 🔐 - you are the `admin` in your specific `category`
  - 🔓 - you have `full permissions` there, for example:
    - #️⃣ - you can `create new channels`,
    - 🤖 - add new `bot instructions` messages
    - 📝 - edit `channel topics`
  - 🔏- others only have `read` permissions by default
    - 🔒 - but `private` channels can still be created as desired