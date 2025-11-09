const baseuri = "https://gelbooru.com"

function parseURIParameters(uri){
    if(typeof uri !== "string") return null

    const splt = "<s>"
    const pstr = uri.split("?").join(splt).split("&").join(splt).split(splt).slice(1)
    const objParams = {}

    pstr.forEach(ps => {
        const k = ps.split("=")

        objParams[k[0]] = decodeURIComponent(k[1])
    })

    return objParams
}

function isNNN(){
    const curDate = new Date()

    return (new Date(`1 November ${curDate.getFullYear()}`) < curDate) && (new Date(`31 November ${curDate.getFullYear()}`) > curDate)
}

chrome.runtime.onInstalled.addListener(details => {
    if(details.reason === "install"){
        chrome.storage.local.set({ nnnblock: true })
    }

    if(isNNN()){
        chrome.storage.local.get(['nnnblock'], options => {
            if(options.nnnblock){
                chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(err => undefined)
            }
        })
    }
})

chrome.tabs.onUpdated.addListener((tabId, tab) => {
    if(isNNN()){
        if(tab.status !== "loading") return

        if(tab.url){
            if(!tab.url.startsWith(baseuri)) return
        } else {
            return
        }
    
        chrome.storage.local.get(['nnnblock'], options => {
            if(options.nnnblock){
                chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(err => undefined)
            }
        })
    }
})

chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
        let setInfobox = (content, textColor) => port.postMessage({ type: "action", action: "setInfobox", data: { content: (typeof content === "string" ? content : "noContent"), textColor: (typeof textColor === "string" ? textColor : "greenyellow") } })
        let throwError = (err) => port.postMessage({ type: "action", action: "setInfobox", data: { content: (err ? err.toString() : "noErr"), textColor: "red" } })
        let throwWarning = (warning) => port.postMessage({ type: "action", action: "setInfobox", data: { content: `/!\\ ` + (typeof warning === "string" ? warning : "noWarning"), textColor: "yellow" } })

        chrome.tabs.query({}).then(tabs => {
            var posttabs = tabs.filter(tab => {
                const up = parseURIParameters(tab.url)
    
                if(tab.url.startsWith(baseuri) && (up.page === "post") && (up.s === "view") && (!isNaN(up.id))){
                    return true
                } else {
                    return false
                }
            })

            if(message.type === "autoclosetabs_swchange"){
                chrome.storage.local.set({ autoclosetabs: message.data })
            } else if(message.type === "nnnblock_swchange"){
                chrome.storage.local.set({ nnnblock: !message.data })

                if(isNNN() && !message.data){
                    chrome.tabs.query({}).then(tabs => tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))).catch(throwError)
                }
            } else {
                chrome.storage.local.get(null, options => {
                    if(options.nnnblock && isNNN()){
                        throwError("Nuh-uh :/")
                        tabs.filter(tab => tab.url.startsWith(baseuri)).forEach(tab => chrome.tabs.remove(tab.id))
        
                        return
                    }
    
                    if(!posttabs.length) return throwWarning("No Gelbooru post tabs found.")
    
                    if(message.type === "cpgl"){
                        port.postMessage({ type: "action", action: "clipboardWriteText", data: { content: posttabs.map(tab => tab.url).join("\n") } })
                        setInfobox("Gelbooru post links copied to clipboard ;>>")
                    
                    
                    
                        } else if(message.type === "dgpi"){
                        const fposttabs = [...new Set(posttabs.map(tab => parseURIParameters(tab.url).id))];
                        
                        if (fposttabs.length === 0) {
                            return throwWarning("No valid Gelbooru post tabs found to download.");
                        }

                        // This async function processes downloads one by one.
                        const downloadManager = async (ids) => {
                            chrome.storage.local.get(['api_credentials'], async (storage) => {
                                if (!storage.api_credentials) {
                                    return throwError("API credential string not saved. Please check extension settings.");
                                }
                                const id = ids.shift(); 
                                try {
                                    
                                    const authenticatedUrl = `${baseuri}/index.php?page=dapi&s=post&q=index&json=1&id=${id}${storage.api_credentials}`;
                                    
                                    const response = await fetch(authenticatedUrl);

                                    if (!response.ok) {
                                        const errorText = await response.text();
                                        throw new Error(`HTTP ${response.status}. Server: ${errorText.substring(0, 200)}`);
                                    }

                                    const data = await response.json();

                                    if (!data || !data.post || !data.post.length === 0) {
                                        throw new Error(`API returned no 'post' data.`);
                                    }
                                    const post = data.post[0];
                                    const imageUrl = post.file_url;
                                    const fileExtension = imageUrl.substring(imageUrl.lastIndexOf('.'));
                                    const filename = `gelbooru_${post.id}_${post.md5}${fileExtension}`;
                                    
                                    chrome.downloads.download({ url: imageUrl, filename: filename }).catch(throwError);
                                    setInfobox(`Downloading: ${filename}`);

                                    if (ids.length > 0) {
                                        setTimeout(() => downloadManager(ids), 500);
                                    } else {
                                        setInfobox("All downloads completed!");
                                        chrome.storage.local.get('autoclosetabs', options => {
                                           if (options.autoclosetabs) {
                                               posttabs.forEach(tab => chrome.tabs.remove(tab.id));
                                           }
                                        });
                                    }

                                } catch (error) {
                                    throwError(`Download failed on ID ${id}: ${error.message}`);
                                }
                            });
                        };

                        // Start the download manager.
                        downloadManager(fposttabs);




                    }


                    if(message.type !== "closetabs" && options.autoclosetabs){
                        posttabs.forEach(tab => chrome.tabs.remove(tab.id))
                    }
                })
            }
        }).catch(throwError)
    })
})
