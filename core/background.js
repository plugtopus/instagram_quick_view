chrome['webRequest']['onBeforeSendHeaders'].addListener(function(info) {
    var headers = info['requestHeaders'];
    var modify = false;
    for (var i = 0; i < headers.length; i++) {
        if (headers[i].name == 'modify_insta_headers') {
            modify = true;
            headers.splice(i, 1);
            break;
        }
    }
    if (modify) {
        for (var i = 0; i < headers.length;) {
            if (/referer/i.test(headers[i].name)) {
                headers.splice(i, 1);
            } else if (/x-csrftoken/i.test(headers[i].name)) {
                headers.splice(i, 1);
            } else if (/user-agent/i.test(headers[i].name)) {
                headers.splice(i, 1);
            } else if (/x-ig-capabilities/i.test(headers[i].name)) {
                headers.splice(i, 1);
            } else if (/cookie/i.test(headers[i].name)) {
                headers.splice(i, 1);
            } else {
                i++;
            }
        }
        headers.push({
            name: "referer",
            value: Insta.api.url
        });
        headers.push({
            name: "x-csrftoken",
            value: Insta.api.cookies.csrftoken
        });
        headers.push({
            name: "user-agent",
            value: "Instagram 10.26.0 (iPhone7,2; iOS 10_1_1; en_US; en-US; scale=2.00; gamut=normal; 750x1334) AppleWebKit/420+"
        });
        headers.push({
            name: "x-ig-capabilities",
            value: "36oD"
        });
        headers.push({
            name: "cookie",
            value: "ds_user_id=" + Insta.api.cookies.ds_user_id + "; sessionid=" + Insta.api.cookies.sessionid + "; csrftoken=" + Insta.api.cookies.csrftoken + ";"
        });
    }

    return {
        requestHeaders: headers
    };
}, {
    urls: ["*://*.instagram.com/*"],
    types: ["xmlhttprequest"]
}, ["blocking", "requestHeaders"]);

function Request(settings, onSuccess, onError) {
    var xhr = new XMLHttpRequest();

    var params;

    xhr.open(settings.method || 'GET', settings.url, true);
    if (Array.isArray(settings.headers)) {
        for (var i = 0; i < settings.headers.length; i++) {
            xhr.setRequestHeader(settings.headers[i].name, settings.headers[i].value);
        }
    }
    if (Array.isArray(settings.params)) {
        params = [];
        for (var i = 0; i < settings.params.length; i++) {
            params.push(settings.params[i].name + '=' + encodeURIComponent(settings.params[i].value));
        }
        params = params.join('&');
    }
    xhr.onload = function() {
        onSuccess && onSuccess(xhr);
    }
    xhr.onerror = function(e) {
        onError && onError(e);
    }
    xhr.send(params);
}

var Insta = {};
Insta.api = {
    url: "https://www.instagram.com/",
    storys_url: "https://i.instagram.com/api/v1/feed/reels_tray/",
    user_storys_url: "https://i.instagram.com/api/v1/feed/user/{user_id}/story/",
    feeds_cursor: null,
    cookies: {}
};

Insta.api.Auth = function() {
    var url = Insta.api.url;

    chrome.tabs.create({
        "url": url
    }, function(tab) {

    });
}

Insta.api.getCookies = function(callback) {
    chrome.cookies.getAll({
        url: Insta.api.url
    }, function(cookies) {
        for (var i = 0; i < cookies.length; i++) {
            Insta.api.cookies[cookies[i].name] = cookies[i].value;
        }
        callback && callback();
    });
}

Insta.api.GetFeed = function(callback) {
    var url = Insta.api.url;
    Request({
        method: 'GET',
        url: url
    }, function(xhr) {
        var login = false;
        var feed = [];
        var data = {};
        try {
            var text = xhr.responseText;

            if (text.indexOf("not-logged-in") != -1) {
                login = true;
            } else {
                var res = text.match(/window\._sharedData\s*=\s*({.*})\s*;/);
                data = JSON.parse(res[1]);
                try {
                    if (data.entry_data.FeedPage[0].graphql.user.edge_web_feed_timeline.page_info.has_next_page) {
                        Insta.api.feeds_cursor = data.entry_data.FeedPage[0].graphql.user.edge_web_feed_timeline.page_info.end_cursor;
                    } else {
                        Insta.api.feeds_cursor = null;
                    }
                    Insta.api.csrftoken = data.config.csrf_token;
                } catch (e) {}
                var tmp_feed = data.entry_data.FeedPage[0].graphql.user.edge_web_feed_timeline.edges;
                var tmp_map = {};
                for (var i = 0; i < tmp_feed.length; ++i) {
                    if (tmp_feed[i].node.shortcode && !tmp_map[tmp_feed[i].node.shortcode]) {
                        feed.push(tmp_feed[i].node);
                    }
                    tmp_map[tmp_feed[i].node.shortcode] = true;
                }
            }
        } catch (e) {};

        callback && callback(login, data, feed);
    });
};

Insta.api.GetNextNFeeds = function(n, callback) {
    if (!Insta.api.feeds_cursor) {
        callback && callback({
            success: {
                no_feeds: true
            }
        });
        return;
    }
    Insta.api.getCookies(function() {
        var variables = {
            fetch_media_item_count: n || 10,
            fetch_comment_count: 4,
            fetch_like: 10,
            has_stories: false,
            fetch_media_item_cursor: Insta.api.feeds_cursor
        };

        Request({
            method: 'GET',
            headers: [{
                name: 'modify_insta_headers',
                value: 1
            }],
            url: "https://www.instagram.com/graphql/query/?query_id=17842794232208280&variables=" + encodeURIComponent(JSON.stringify(variables))
        }, function(xhr) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status == 'ok') {
                    if (result.data.user.edge_web_feed_timeline.page_info.has_next_page) {
                        Insta.api.feeds_cursor = result.data.user.edge_web_feed_timeline.page_info.end_cursor;
                    } else {
                        Insta.api.feeds_cursor = false;
                    }
                    callback && callback({
                        success: result
                    });
                } else {
                    callback && callback({
                        error: result
                    });
                }
            } catch (e) {
                callback && callback({
                    error: e
                });
            };
        }, function(e) {
            callback && callback({
                error: e
            });
        });
    });
}

Insta.api.GetStorys = function(callback) {
    Insta.api.getCookies(function() {
        Request({
            method: 'GET',
            headers: [{
                name: 'modify_insta_headers',
                value: 1
            }],
            url: Insta.api.storys_url
        }, function(xhr) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status == 'ok') {
                    callback && callback({
                        success: result
                    });
                } else {
                    callback && callback({
                        error: result
                    });
                }
            } catch (e) {
                callback && callback({
                    error: e
                });
            };
        }, function(e) {
            callback && callback({
                error: e
            });
        });
    });
}

Insta.api.GetUserStorys = function(user_id, callback) {
    Insta.api.getCookies(function() {
        Request({
            method: 'GET',
            headers: [{
                name: 'modify_insta_headers',
                value: 1
            }],
            url: Insta.api.user_storys_url.replace('{user_id}', user_id)
        }, function(xhr) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status == 'ok') {
                    callback && callback({
                        success: result
                    });
                } else {
                    callback && callback({
                        error: result
                    });
                }
            } catch (e) {
                callback && callback({
                    error: e
                });
            };
        }, function(e) {
            callback && callback({
                error: e
            });
        });
    });
}

Insta.api.SetLike = function(postId, likeStatus, callback) {
    Insta.api.getCookies(function() {
        Request({
            method: 'POST',
            headers: [{
                name: 'modify_insta_headers',
                value: 1
            }],
            url: Insta.api.url + 'web/likes/' + postId + '/' + (likeStatus ? 'like' : 'unlike') + '/'
        }, function(xhr) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status == 'ok') {
                    callback && callback({
                        success: result
                    });
                } else {
                    callback && callback({
                        error: result
                    });
                }
            } catch (e) {
                callback && callback({
                    error: e
                });
            };
        }, function(e) {
            callback && callback({
                error: e
            });
        });
    });
}

Insta.api.AddComment = function(postId, text, callback) {
    Insta.api.getCookies(function() {
        Request({
            method: 'POST',
            headers: [{
                name: 'modify_insta_headers',
                value: 1
            }, {
                name: 'content-type',
                value: 'application/x-www-form-urlencoded'
            }],
            params: [{
                name: 'comment_text',
                value: text
            }],
            url: Insta.api.url + 'web/comments/' + postId + '/add/'
        }, function(xhr) {
            try {
                var result = JSON.parse(xhr.responseText);
                if (result.status == 'ok') {
                    callback && callback({
                        success: result
                    });
                } else {
                    callback && callback({
                        error: result
                    });
                }
            } catch (e) {
                callback && callback({
                    error: e
                });
            };
        }, function(e) {
            callback && callback({
                error: e
            });
        });
    });
}

