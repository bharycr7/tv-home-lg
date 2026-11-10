// TV Home for LG webOS: everything you'd want to change lives here.
window.CONFIG = {
  // Weather. Leave lat/lon empty to use the internet connection's rough location (get.geojs.io, once a week).
  weather: { lat: '', lon: '', unit: 'celsius' },   // unit: 'celsius' or 'fahrenheit'
  clock24h: false,

  // "New in Tamil & Malayalam" mood: fetches new titles weekly from JustWatch's public website API (unofficial). Off by default.
  freshFeed: false,

  // Background music: put an MP3 at audio/bgm.mp3. The remote's Play/Pause button turns it on or off.
  music: { file: 'audio/bgm.mp3', volume: 0.35 },

  // HDMI port the dock's input tile switches to (Fire TV Stick is on HDMI 1).
  ps5Hdmi: 1,

  // Streaming services. `ids` are the possible webOS app ids (the first one installed is used).
  services: {
    netflix: { name: 'Netflix',     ids: ['netflix'],                         color: '#E50914' },
    prime:   { name: 'Prime Video', ids: ['amazon', 'amazon.html'],           color: '#00A8E1' },
    disney:  { name: 'Disney+',     ids: ['com.disney.disneyplus-prod'],      color: '#1C4EE8' },
    youtube: { name: 'YouTube',     ids: ['youtube.leanback.v4'],             color: '#FF1A1A' },
    appletv: { name: 'Apple TV',    ids: ['com.apple.appletv'],               color: '#B8C0CC' },
    hulu:    { name: 'Hulu',        ids: ['hulu'],                            color: '#1CE783' },
    max:     { name: 'HBO Max',     ids: ['com.wbd.hbomax', 'com.hbo.hbomax', 'hbomax', 'com.hbo.max'], color: '#6B2BF5' },
    peacock: { name: 'Peacock',     ids: ['com.peacocktv.peacock', 'com.peacock.tv', 'peacock'],     color: '#F5B700' },
    sunnxt:  { name: 'Sun NXT',     ids: ['sunnxt', 'com.suntv.sunnxt', 'com.sunnxt.app'],           color: '#FF7A00' }
  },

  // The dock, left to right. Each app shows its name; to use a logo, put a white PNG in img/icon/ and set icon: 'file-name'.
  dock: [
    { svc: 'netflix', icon: '',             lines: ['Pick up where you left off.'] },
    { svc: 'prime',   icon: '',             lines: ['Something new tonight?'] },
    { svc: 'disney',  icon: '',             lines: ['A little magic, maybe?'] },
    { svc: 'ps5',     icon: '',             lines: ['Over to the stick.'], name: 'Fire TV', color: '#FF9900' },
    { svc: 'youtube', icon: '',             lines: ['Just one more video.'] },
    { svc: 'appletv', icon: '',             lines: ['Prestige hour.'] }
  ],

  moods: [
    { id: 'fresh',      name: 'New in Tamil & Malayalam', color: '#E8B04B' },
    { id: 'sitcom',     name: 'Comfort watch',     color: '#F2B84B' },
    { id: 'capes',      name: 'Capes and chaos',   color: '#E5484D' },
    { id: 'gotham',     name: 'Gotham after dark', color: '#E8D9A0' },
    { id: 'superstar',  name: 'Superstar mass',    color: '#FF8A3D' },
    { id: 'mind',       name: 'Mind games',        color: '#3DBE8B' },
    { id: 'anything',   name: 'Anything at all',   color: '#B8C0CC' }
  ],

  // "More apps": shown if installed (webOS doesn't let normal apps list everything installed).
  moreApps: [
    { id: 'hulu', title: 'Hulu' }, { id: 'com.wbd.hbomax', title: 'HBO Max' }, { id: 'com.hbo.hbomax', title: 'HBO Max' },
    { id: 'com.peacocktv.peacock', title: 'Peacock' }, { id: 'com.peacock.tv', title: 'Peacock' },
    { id: 'spotify-beehive', title: 'Spotify' }, { id: 'com.zee5.app', title: 'ZEE5' }, { id: 'sunnxt', title: 'Sun NXT' },
    { id: 'tv.twitch.tv.starshot.lg', title: 'Twitch' }, { id: 'cdp-30', title: 'Plex' }, { id: 'vudu', title: 'Fandango at Home' },
    { id: 'com.paramountplus.app', title: 'Paramount+' }, { id: 'com.crunchyroll.crunchyroll', title: 'Crunchyroll' },
    { id: 'com.webos.app.lgchannels', title: 'LG Channels' }, { id: 'com.webos.app.livetv', title: 'Live TV' },
    { id: 'com.webos.app.browser', title: 'Web Browser' }, { id: 'com.webos.app.photovideo', title: 'Photo & Video' },
    { id: 'com.webos.app.music', title: 'Music' }, { id: 'com.webos.app.discovery', title: 'LG Content Store' },
    { id: 'com.palm.app.settings', title: 'Settings' }
  ]
};
