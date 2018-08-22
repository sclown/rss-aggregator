'use strict'

const FeedParser = require('feedparser');
const request = require('request');
const LRU = require('lru-cache'); 

class RSSChannel {
  constructor(url, handleNew) {
    this.url = url;
    this.cache = LRU(1000)
    this.getNews()
  }

  getNews(handler) {
    const channel = this;
    const req = request(this.url);
    const feedparser = new FeedParser({});
    let newItems = [];
    req.on('error', (error) => {
    });
        
    req.on('response', (res) => {
        const stream = req;        
        if (res.statusCode !== 200) {
            stream.emit('error', new Error('Bad status code'));
        }
        else {
            stream.pipe(feedparser);
        }
    });
        
    feedparser.on('error', (error) => {
    });
        
    feedparser.on('readable', () => {
        const stream = feedparser; // `this` is `feedparser`, which is a stream
        let item = null;

        while (item = stream.read()) {
            if(!this.cache.get(item.guid)) {
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

