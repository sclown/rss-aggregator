'use strict'

const FeedParser = require('feedparser');
const request = require('request');
const URL = require('url');
const LRU = require('lru-cache'); 
const log4js = require('log4js');

const logger = log4js.getLogger('rss');


class RSSChannel {
  constructor(url, handleNew) {
    this.url = url;
    this.hostURL = this.getHostURL(url);
    this.cache = LRU(1000);
    this.getNews();
  }

  getHostURL(urlString) {
    const parsedURL = URL.parse(urlString);
    if(!parsedURL){
        return "";
    }
    return `${parsedURL.protocol}//${parsedURL.hostname}`;

  }

  getNews(handler) {
    const channel = this;
    const req = request(this.url);
    const feedparser = new FeedParser({});
    let newItems = [];
    req.on('error', (error) => {
        logger.error(`Request error ${channel.url}: ${error}`)
    });
        
    req.on('response', (res) => {
        const stream = req;        
        if (res.statusCode !== 200) {
            stream.emit('error', new Error('Bad status code'));
            logger.error(`Feedparder ${channel.url}: Bad status code`)
        }
        else {
            stream.pipe(feedparser);
        }
    });
        
    feedparser.on('error', (error) => {
        logger.error(`Feedparder ${channel.url}: ${error}`)
    });
        
    feedparser.on('readable', () => {
        const stream = feedparser; // `this` is `feedparser`, which is a stream
        let item = null;

        while (item = stream.read()) {
            if(!this.cache.get(item.guid)) {
                logger.info("New item: " + item.guid);
                if(item.link && item.link.startsWith("/")) {
                    item.link = this.hostURL + item.link;
                }
                newItems.push(item);
                this.cache.set(item.guid, item.link);
            }

        }
    });
    feedparser.on('end', () => {
        handler && handler(newItems);
    });


  }
}

module.exports = RSSChannel

