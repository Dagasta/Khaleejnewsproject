const url = 'https://news.google.com/rss/search?q=when:7D+"new+AI+tools"+OR+"underrated+AI"+OR+"trending+AI"&hl=en-US&gl=US&ceid=US:en';
console.log('Fetching', url);
fetch(url).then(r => r.text()).then(t => console.log('Length:', t.length, 'Content:', t.slice(0, 500))).catch(e => console.error(e));
