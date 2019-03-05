'use strict'

const RSSChannel = require("./rsschannel.js");
const TelegramBot = require('node-telegram-bot-api');
const log4js = require('log4js');

log4js.configure({
  appenders: { 
    lifestyle: { type: 'file', filename: 'lifecycle.log', maxLogSize: 5000000, backups: 3 }, 
    rss: { type: 'file', filename: 'rss.log', maxLogSize: 5000000, backups: 3 } 
  },
  categories: { 
      default: { appenders: ['lifestyle'], level: 'info' },
      rss: { appenders: ['rss'], level: 'info' }
  }
});

const logger = log4js.getLogger();

const fs = require('fs');

logger.info("Launching bot");
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const bot = new TelegramBot(config.token, {polling: true});

class TGChannel {
    constructor(channel, feeds) {
        this.index = 0;
        this.receiver = channel;
        this.channels = [];
        feeds.forEach( (url) => { 
            this.channels.push( new RSSChannel(url) ); 
        });    
        if( this.channels.length > 0 ) {
            const that = this;
            setTimeout(() => {
                that.checkNews();
            }, config.timeout);
        }
    }

    processItems(items) {
        items.forEach((item) => { 
            const message = `[${item.title}](${item.link})`;
            logger.info(`${this.receiver} message: ${message}`);
            bot.sendMessage(this.receiver, message,{parse_mode : "Markdown"});
        });
    }

    checkNews() {
        logger.info(this.receiver + " Check news for " + this.channels[this.index].url);
        const that = this;
        this.channels[this.index].getNews((items)=>{ that.processItems(items) });
        this.switchToNextChannel();
        setTimeout(() => {
            that.checkNews();
        }, config.timeout);
    }

    switchToNextChannel() {
        this.index+=1;
        if(this.index>=this.channels.length) {
            this.index = 0;
        }
    }

}  

logger.info("Load channels from config");
const readers = [];
const channels = [];
config.tgchannels.forEach( (ch) => {
    bot.getChat(ch.channel).then( (chat) => {
        if(!findReceiver(chat.id)) {
            channels.push( new TGChannel(chat.id, ch.feeds) ); 
            readers.push({ chatid: chat.id, title: chat.title, themes: [ch.channel] });
            fs.writeFileSync('readers.json', JSON.stringify(readers), 'utf8');                
        }
    });
});

try {
    const savedReaders = JSON.parse(fs.readFileSync('readers.json', 'utf8'));
    savedReaders.filter( reader => !findReceiver(reader.chatid) ).forEach( reader => {
        const channels = config.tgchannels.filter( ch => reader.themes.includes(ch.channel) );
        channels.forEach( ch => { 
            channels.push( new TGChannel(reader.chatid, ch.feeds) );
        });
        readers.push(reader); 
    
    })
    readers.concat();
} 
catch(err) {

}  


bot.on('message', (msg) => {
    if(msg.text.startsWith(botQuoteName())) {
        logger.info("Bot quoted " + msg.text);
        const themes = msg.text.slice(botQuoteName().length).split(' ');
        handleRequest(msg.chat.id, themes.filter( theme => theme.length ));
    }
});

bot.on('channel_post', (msg) => {
    if(msg.text.startsWith(botQuoteName())) {
        logger.info("Bot quoted " + msg.text);
        const themes = msg.text.slice(botQuoteName().length).split(' ');
        handleRequest(msg.chat.id, themes.filter( theme => theme.length ));
    }
});

function botQuoteName() {
    return '@' + config.botName;
}

function findReceiver(receiver) {
    return readers.find( ch => ch.chatid == receiver) != undefined;
}

function addReader(chat, themes) {
    const channels = config.tgchannels.filter( ch => themes.includes(ch.channel) );
    if( channels.length ) {
        let reader = { chatid: chat.id, title: chat.title, themes: themes };
        channels.forEach( ch => { 
            channels.push( new TGChannel(reader.chatid, ch.feeds) ); 
        });
        readers.push(reader);
        fs.writeFileSync('readers.json', JSON.stringify(readers), 'utf8');            
        logger.info("Added reader " + JSON.stringify(reader));
    }                

}

function handleRequest(chatID, themes) {
    bot.getChat(chatID).then( (chat) => {
        if(!findReceiver(chat.id)) {
            addReader(chat, themes);
        }
    });
}

