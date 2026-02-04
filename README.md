# AlterProx

**Live website:** [AlterProx](https://benti.dev/alter)


AlterProx is a free, open-source web client for [Alter Aeon](http://alteraeon.com/). A live version is currently available [here](https://benti.dev/alter), but it should be pretty easy to run on your own, if you so choose.

## How it works

AlterProx works by proxying a client's websocket connection to a telnet connection, which is of course connected to Alter Aeon itself. Additionally, it handles KXWT data for you, and displays certain statistics visually. The server-side code is very basic, but functional. The client-side code is not my proudest work, but again, it works. If you'd like some nice looking code, have a look at my better repos.

## Why?

I like to make web apps because they're very easily accessible to everyone, regardless of OS or computer. The original Alter Aeon web client doesn't work anymore, since it relied on Adobe Flash, which is now deprecated. Also I wanted to mess around with KXWT data because I thought it was cool.

## Setup

If you do choose to set this up yourself, here's a basic list of steps:

1. Clone the repository: `git clone https://github.com/TylerSelden/alterprox`.
2. Enter the directory and run `npm i` to install necessary packages.
3. Modify the `config.json` file to meet your needs (more info below).
4. Start the server with `npm start`.

**Note:** Make sure you're serving the `web/` directory somewhere, and that you modify the websocket URL in it.

## `config.json`

A standard `config.json` file would look something like this:

```json
{
  "targetHost": "alteraeon.com",
  "targetPort": 3000,
  "socketPort": 8080
}
```

**What each key/value pair means:**

- `targetHost`: This is the hostname of the target telnet host (in this case, Alter Aeon).
- `targetPort`: The port to use for that hostname.
- `socketPort`: The local port to run the WebSocket server on.

## Notes

This is _clearly_ a work in progress. If you notice any bugs or have any suggestions/ideas, please feel free to open an issue or pull request, I'll take a look and do my best to work on it.
