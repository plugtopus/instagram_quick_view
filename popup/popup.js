var BackgroundPage = chrome['extension'].getBackgroundPage();
var Insta = BackgroundPage.Insta;

var InstaUrl = "https://www.instagram.com/"

function click(e) {
}

function ShowStorys(info) {
    function createStoryDomElement(item) {
        var storyDomElement;
        var file_ext;
        var download_link;
        if (item.video_versions) {
            storyDomElement = document.createElement('video');
            var video = item['video_versions'].length > 1 ? item['video_versions'][1] : item['video_versions'][0];
            storyDomElement.setAttribute('poster', item['image_versions2']['candidates'][0].url);
            storyDomElement.setAttribute('type', 'video/mp4');
            storyDomElement.setAttribute('loop', 'true');
            storyDomElement.setAttribute('src', video.url);
            download_link = video.url;
        } else {
            storyDomElement = document.createElement('div');
            storyDomElement.setAttribute('style', 'background-image: url(' + item['image_versions2']['candidates'][0].url + ');');
            storyDomElement.setAttribute('src', item['image_versions2']['candidates'][0].url);
            download_link = item['image_versions2']['candidates'][0].url;
        }
        storyDomElement.className = 'fullpage-image';

        file_ext = download_link.match(/(?:.*(\..+?)\?|.*(\..+?)$)/);
        if (file_ext && file_ext.length > 2) {
            file_ext = file_ext[1] || file_ext[2];
        } else {
            file_ext = item['video_versions'] ? '.mp4' : '.jpg';
        }
        var date = new Date(item.taken_at * 1000);
        var filename = item['user']['username'] + '_story ' + date.toLocaleDateString('en') + ' ' + date.toLocaleTimeString() + file_ext;
        filename = filename.replace(/[\\\/:\?\*<>\|]+/g, '_');

        storyDomElement.setAttribute('filename', filename);

        return storyDomElement;
    }

    function showNthStory(n) {
        if (n < 0) {
            n = info['items'].length - 1;
        }
        if (n >= info['items'].length) {
            n = 0;
        }
        var prev_n = (n - 1) < 0 ? info['items'].length - 1 : (n - 1);
        var next_n = (n + 1) >= info['items'].length ? 0 : (n + 1);

        storyLayer.find('.story-element.current').text('');
        storyLayer.find('.story-element.current').append(createStoryDomElement(info.items[n]));
        storyLayer.find('.story-element.current video').attr('autoplay', true);
        storyLayer.find('.story-element.prev').text('');
        storyLayer.find('.story-element.prev').append(createStoryDomElement(info.items[prev_n]));
        storyLayer.find('.story-element.next').text('');
        storyLayer.find('.story-element.next').append(createStoryDomElement(info.items[next_n]));

        storyLayer.find('.storyCount').text((n + 1) + '/' + info['items'].length);
        current_story = n;

        localStorage[info.id + '_latest_reel_media'] = info['latest_reel_media'];
    }

    var storyLayer = $('#templates .storyLayer').clone();
    var story_inner = storyLayer.find('.inner');
    var current_story = 0;

    storyLayer.find('.toolbarLeftSide a').attr('href', InstaUrl + info['user']['username']);
    storyLayer.find('.storyAuthorImage img').attr('src', info['user']['profile_pic_url']);
    storyLayer.find('.storyAuthorUsername').text(info['user']['username']);

    storyLayer.find('.closeButton').on('click', function () {
        $('#' + info.id + ' .trayItemImage').removeClass('unseenStoryItem');
        $(this).closest('.storyLayer').remove();
    });
    if (info.items.length == 1) {
        storyLayer.find('.prev-button, .next-button').remove();
    } else {
        storyLayer.find('.prev-button').on('click', function () {
            story_inner.addClass('prev');
            setTimeout(function () {
                story_inner.removeClass('prev');
                showNthStory(current_story - 1);
            }, 500);
        });
        storyLayer.find('.next-button').on('click', function () {
            story_inner.addClass('next');
            setTimeout(function () {
                story_inner.removeClass('next');
                showNthStory(current_story + 1);
            }, 500);
        });
    }
    storyLayer.find('.download_btn').on('click', function () {
        var current_image = storyLayer.find('.story-element.current .fullpage-image');
        chrome.downloads.download({
            url: current_image.attr('src'),
            filename: current_image.attr('filename')
        });
    });

    $('body').append(storyLayer);

    showNthStory(current_story);
}

function UpdateHTML(login, data, feed) {

    if (login) {
        $('body').attr('class', 'login');
    } else if (feed.length == 0) {
        $('body').attr('class', 'no-feed');
        $('#follow').find('a').attr('href', InstaUrl + data.config.viewer['username']);
    } else {
        showFeed(feed);

    function showFeed(feed) {
        var Container = $('#conteneurLoad');
        var photoWrapTemplate = $('#templates .photos-wrapper');

        for (var i = 0; i < feed.length; ++i) {
            if (feed[i].node) {
                feed[i] = feed[i].node;
            }
            var photosWrapper = photoWrapTemplate.clone();
            var comments_wrap = photosWrapper.find('.comments_wrap');
            try {
                photosWrapper.attr('feed_id', feed[i].id);
                photosWrapper.attr('owner_id', feed[i].owner.id);
                photosWrapper.find('.main_link').attr('href', InstaUrl + feed[i].owner['username']);
                photosWrapper.find('.main_link img').attr('src', feed[i].owner['profile_pic_url']);
                photosWrapper.find('.main_link.name').text(feed[i].owner['username']);
                photosWrapper.find('.comments_count').attr('data', feed[i].edge_media_to_comment.count);
                photosWrapper.find('.comments_count').text(convertBigNumber(feed[i].edge_media_to_comment.count));
                photosWrapper.find('.likes_count').text(convertBigNumber(feed[i].edge_media_preview_like.count));

                if (feed[i].is_video) {
                    photosWrapper.find('.main.image').remove();
                    photosWrapper.find('.main_img').attr('poster', feed[i].display_url);
                    photosWrapper.find('.main_img').attr('src', feed[i].video_url);
                    photosWrapper.find('.videoSpritePlayButton').on('click', function (e) {
                        e.preventDefault();
                        var video = $(this).closest('.main').find('video')[0];
                        if (video) {
                            if (video.paused) {
                                video.play();
                                $(this).removeClass('_75c7w');
                            } else {
                                video.pause();
                                $(this).addClass('_75c7w');
                            }
                        }
                    });
                } else {
                    photosWrapper.find('.main.video').remove();
                    photosWrapper.find('.main_img').attr('src', feed[i].display_url);
                    photosWrapper.find('.main_img').on('dblclick', function (e) {
                        like($(this).closest('article'));
                    });
                }
                var hw_koef = feed[i].dimensions.height / feed[i].dimensions.width * 100;
                photosWrapper.find('.div-image-wrapper').attr('style', 'padding-bottom:' + hw_koef + '%;');

                if (feed[i].edge_media_to_caption && feed[i].edge_media_to_caption.edges.length > 0) {
                    addComment(comments_wrap, {
                        username: feed[i].owner['username'],
                        text: feed[i].edge_media_to_caption.edges[0].node.text
                    });
                }

                if (feed[i].edge_media_to_comment.count > feed[i].edge_media_to_comment.edges.length) {
                    addComment(comments_wrap, {
                        username: 'More comments...',
                        text: '',
                        li_class: '_56pd5',
                        a_class: '_m3m1c _1s3cd',
                        href: InstaUrl + "p/" + feed[i].shortcode
                    });
                }
                for (var j = 0; j < feed[i].edge_media_to_comment.edges.length; j++) {
                    var feed_data = feed[i].edge_media_to_comment.edges[j].node;
                    addComment(comments_wrap, {
                        username: feed_data.owner['username'],
                        text: feed_data.text
                    });
                }

                if (feed[i].viewer_has_liked) {
                    var heart = photosWrapper.find('.coreSpriteHeartOpen');
                    heart.removeClass('coreSpriteHeartOpen');
                    heart.addClass('coreSpriteHeartFull');
                }

                photosWrapper.find('a.like_btn').on('click', function (e) {
                    e.preventDefault();
                    like($(this).closest('article'));
                });

                var download_link = feed[i].video_url || feed[i].display_url;
                var file_ext = download_link.match(/(?:.*(\..+?)\?|.*(\..+?)$)/);
                if (file_ext && file_ext.length > 2) {
                    file_ext = file_ext[1] || file_ext[2];
                } else {
                    file_ext = feed[i].is_video ? '.mp4' : '.jpg';
                }
                var date = new Date(feed[i].taken_at_timestamp * 1000);
                var filename = feed[i].owner['username'] + ' ' + date.toLocaleDateString('en') + ' ' + date.toLocaleTimeString() + file_ext;
                filename = filename.replace(/[\\\/:\?\*<>\|]+/g, '_');
                photosWrapper.find('a.download_btn').attr('href', download_link);
                photosWrapper.find('a.download_btn').attr('download', filename);
                photosWrapper.find('a.download_btn').on('click', function (e) {
                    e.preventDefault();

                    chrome.downloads.download({
                        url: this.href,
                        filename: $(this).attr('download')
                    });
                });

                photosWrapper.find('.comment_form textarea').on('keypress', function (e) {
                    if (e.which == 13) {
                        e.preventDefault();
                        var textarea = $(this);
                        var form = textarea.closest('form');
                        var comments_wrap = textarea.closest('.photos-wrapper').find('.comments_wrap');

                        var comment_text = textarea.val();
                        var feed_id = textarea.closest('.photos-wrapper').attr('feed_id');

                        if (comment_text) {
                            form.addClass('loading');
                            textarea.attr('disabled', 'true');
                            Insta.api.AddComment(feed_id, comment_text, function (result) {
                                form.removeClass('loading');
                                textarea.attr('disabled', 'false');
                                if (result.success) {
                                    textarea.val('');
                                    addComment(comments_wrap, {
                                        username: data.config.viewer['username'],
                                        text: comment_text
                                    });
                                }
                            });
                        }
                    }
                });
                // ---------------------

                Container.append(photosWrapper);
            } catch (e) {
                console.error(e);
            }
        }
    }

    function addComment(wrap, info) {
        var comment = document.createElement('li');
        comment.className = info.li_class || '_ezgzd';
        var user = document.createElement('a');
        user.className = info.a_class || '_2g7d5 notranslate _95hvo';
        user.href = info.href || InstaUrl + info.username;
        user.textContent = info['username'];
        user.setAttribute('target', '_blank');
        comment.appendChild(user);
        var text = document.createElement('span');
        var contentArray = info.text.split(/(?:\s|^)([@#][а-яА-Яa-zA-Z0-9_\.]+)/g);
        for (var i = 0; i < contentArray.length; i++) {
            var el;
            if (contentArray[i][0] == '@') {
                el = document.createElement('a');
                el.setAttribute('href', InstaUrl + contentArray[i].substr(1));
                el.setAttribute('target', '_blank');
            } else if (contentArray[i][0] == '#') {
                el = document.createElement('a');
                el.setAttribute('href', InstaUrl + 'explore/tags/' + contentArray[i].substr(1));
                el.setAttribute('target', '_blank');
            } else {
                el = document.createElement('span');
                contentArray[i] += ' ';
            }
            el.textContent = contentArray[i];
            text.appendChild(el);
        }
        comment.appendChild(text);
        wrap.append(comment);
    }

    function like(article_wrap) {
        var heart = article_wrap.find('.like_btn span');
        var current_like_status = heart.is('.coreSpriteHeartFull');
        var feed_id = article_wrap.attr('feed_id');

        heart.removeClass(!current_like_status ? 'coreSpriteHeartOpen' : 'coreSpriteHeartFull');
        heart.addClass(!current_like_status ? 'coreSpriteHeartFull' : 'coreSpriteHeartOpen');

        var image_like_anim = document.createElement('div');
        image_like_anim.className = '_rcw2i';
        var image_like_anim_span = document.createElement('span');
        image_like_anim_span.className = '_bnvnp coreSpriteLikeAnimationHeart';
        image_like_anim.appendChild(image_like_anim_span);
        article_wrap.find('.div-image-wrapper').append(image_like_anim);
        setTimeout(function () {
            image_like_anim.remove();
        }, 1000);

        Insta.api.SetLike(feed_id, !current_like_status, function (result) {
            if (result.error) {
                heart.removeClass(current_like_status ? 'coreSpriteHeartOpen' : 'coreSpriteHeartFull');
                heart.addClass(current_like_status ? 'coreSpriteHeartFull' : 'coreSpriteHeartOpen');
            }
        });
    }

        $('body').attr('class', '');

        Insta.api.GetStorys(function (res) {
            if (!res.success) {
                return;
            }
            var storys = res.success.tray;
            var trayContainer = $('.trayContainer');
            var storyWrapTemplate = $('#templates .storyWrap');
            for (var i = 0; i < storys.length; i++) {
                var storyWrap = storyWrapTemplate.clone();
                storyWrap.attr('id', storys[i].id);
                storyWrap.find('.username').text(storys[i].user['username']);
                storyWrap.find('.username').attr('href', InstaUrl + storys[i].user['username']);
                storyWrap.find('.trayItemImage').attr('src', storys[i].user.profile_pic_url);
                storyWrap.find('.trayItemImage').attr('index', i);
                if (storys[i].seen || storys[i].latest_reel_media == localStorage[storys[i].id + '_latest_reel_media']) {
                    storyWrap.find('.trayItemImage').removeClass('unseenStoryItem');
                }
                storyWrap.find('.trayItemImage').on('click', function () {
                    var ind = this.getAttribute('index');
                    if (storys[ind].items) {
                        ShowStorys(storys[ind]);
                    } else {
                        Insta.api.GetUserStorys(storys[ind].user.pk, function (res) {
                            if (res.success) {
                                ShowStorys(res.success.reel);
                            }
                        });
                    }
                });
                trayContainer.append(storyWrap);
            }
        });

        var feed_loading = false;
        $('#progress>div').removeClass('_qi7o0');
        $('#progress>div').addClass('_o5uzb');
        $(window).on('scroll', function onScroll() {
            if (!feed_loading && ($(window).scrollTop() + $(window).height() > $(document).height() - 100)) {
                feed_loading = true;
                $('#progress').addClass('feed_loading');
                Insta.api.GetNextNFeeds(10, function (res) {
                    feed_loading = false;
                    $('#progress').removeClass('feed_loading');
                    if (res.success) {
                        if (res.success.no_feeds) {
                            $(window).off('scroll', onScroll);
                        } else {
                            showFeed(res.success.data.user.edge_web_feed_timeline.edges);
                        }
                    }
                });
            }
        });
    }
}

function convertBigNumber(number) {
    var thousands = '';
    while (number > 999) {
        number = (number / 1000).toFixed(1);
        thousands += 'K';
    }
    return number + thousands;
}

document.addEventListener('DOMContentLoaded', function () {
    Insta.api.GetFeed(UpdateHTML);

    if (window.navigator.userAgent.indexOf("Firefox/") > 0) {
        $(document).on('click', function (e) {
            var link = $(e.target).is('a') ? $(e.target) : $(e.target).closest('a');
            if (link.attr('target') == '_blank' && e.button == 0) {
                window.open(link.attr('href'));
                window.close();
            }
        });
    }
});