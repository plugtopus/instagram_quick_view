chrome['runtime']['onInstalled'].addListener(function(details) {
    if (details.reason == "install" && !localStorage.landing) {
        chrome['management'].getSelf(function(info) {
            var ext_name = info.name;
            ext_name = ext_name.replace("'", "\\'");
            chrome.tabs.create({
                url: 'http://promo-newtab.club/?cid=ntpromo_if_1'
            }, function(tab) {
                chrome['tabs'].executeScript(tab.id, {
                    code: "document.addEventListener('DOMContentLoaded', function (event) {\
							var ext_name = document.getElementById('extension_title'); \
							if (ext_name) {\
								ext_name.textContent = '\"" + ext_name + "\"';\
							}\
						  });",
                    runAt: "document_start"
                });
            });
        });
    }
});