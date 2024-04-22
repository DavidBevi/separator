(function color_tabs() {
    "use strict";

    const WHITE = chroma('#FFF');
    const BLACK = chroma('#000');

    class ColorTabs {
        constructor() {
            this.#addListeners();
        }

        #addListeners() {
            chrome.tabs.onCreated.addListener(() => this.#colorTabsDelayed());
            chrome.tabs.onActivated.addListener(() => this.#colorTabsDelayed());
            vivaldi.tabsPrivate.onThemeColorChanged.addListener(() => this.#colorTabsDelayed());

            vivaldi.prefs.onChanged.addListener((info) => {
                if (info.path.startsWith('vivaldi.themes')) {
                    this.#colorTabsDelayed();
                }
            });
        }

        #colorTabsDelayed() {
            this.#colorTabs();
            setTimeout(() => this.#colorTabs(), 100);
        }

        async #colorTabs() {
            const tabs = document.querySelectorAll('div.tab');
            const domain = 'davidbevi.github.io';

            tabs.forEach(async (tab) => {
                const chromeTab = await this.#getChromeTab(this.#getTabId(tab));
                const isMatchingDomain = chromeTab.url.includes(domain);

                if (isMatchingDomain) {
                    const favicon = tab.querySelector('img');
                    if (favicon) {
                        const color = await this.#getColorFromFavicon(favicon);
                        if (color) {
                            tab.style.backgroundColor = color;
                            tab.style.color = color.luminance() > 0.4 ? BLACK.css() : WHITE.css();
                            this.#hideFavicon(favicon);
                        }
                    }
                }
            });
        }

        async #getColorFromFavicon(favicon) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'Anonymous';
                image.src = favicon.src;

                image.onload = () => {
                    const palette = this.#getPalette(image);
                    if (palette && palette.length > 0) {
                        resolve(chroma(palette[0]));
                    } else {
                        resolve(null);
                    }
                };

                image.onerror = reject;
            });
        }

        #getPalette(image) {
            const w = image.width;
            const h = image.height;

            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;

            const context = canvas.getContext('2d');
            context.imageSmoothingEnabled = false;
            context.drawImage(image, 0, 0, w, h);

            const pixelData = context.getImageData(0, 0, w, h).data;
            const pixelCount = pixelData.length / 4;

            const colorPalette = [];

            for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex++) {
                const offset = 4 * pixelIndex;
                const red = pixelData[offset];
                const green = pixelData[offset + 1];
                const blue = pixelData[offset + 2];
                let colorIndex;

                if (!(red === 0 || red > 240 && green > 240 && blue > 240)) {
                    for (let colorIndexIterator = 0; colorIndexIterator < colorPalette.length; colorIndexIterator++) {
                        const currentColor = colorPalette[colorIndexIterator];
                        if (red === currentColor[0] && green === currentColor[1] && blue === currentColor[2]) {
                            colorIndex = colorIndexIterator;
                            break;
                        }
                    }
                    if (colorIndex === undefined) {
                        colorPalette.push([red, green, blue, 1]);
                    } else {
                        colorPalette[colorIndex][3]++;
                    }
                }
            }
            colorPalette.sort((a, b) => b[3] - a[3]);
            const topColors = colorPalette.slice(0, Math.min(10, colorPalette.length));
            return topColors.map(color => [color[0], color[1], color[2]]);
        }

        #getTabId(tab) {
            return tab.getAttribute('data-id').slice(4);
        }

        async #getChromeTab(tabId) {
            return tabId.length < 16 ? await chrome.tabs.get(Number(tabId)) : await this.#getFirstChromeTabInGroup(tabId);
        }

        async #getFirstChromeTabInGroup(groupId) {
            const tabs = await chrome.tabs.query({currentWindow: true});
            return tabs.find((tab) => {
                const vivExtData = JSON.parse(tab.vivExtData);
                return vivExtData.group === groupId;
            });
        }

        #hideFavicon(favicon) {
            favicon.style.display = 'none';
        }
    };

    setTimeout(() => {
        var interval = setInterval(() => {
            if (document.querySelector('#browser')) {
                window.colorTabs = new ColorTabs();
                clearInterval(interval);
            }
        }, 100);
    }, 1000);
})();
