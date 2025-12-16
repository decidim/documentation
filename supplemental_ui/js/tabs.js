/**
 * Generic Tabs Component for Antora Documentation
 * Handles tabbed content with preference persistence
 */

(function() {
    'use strict';

    // Constants
    const SELECTORS = {
        TABS_BLOCK: '.tabs',
        TABS_NAV: '.tabs-nav',
        TAB_BUTTON: '.tabs-nav__button',
        TABS_CONTENT: '.tabs-content',
        TAB_PANEL: '.tabs-content__panel'
    };

    const CLASSES = {
        ACTIVE: 'is-active'
    };

    const STORAGE_PREFIX = 'tabs-preference-';

    /**
     * Storage utilities for tab preferences
     */
    const Storage = {
        get(key) {
            try {
                return localStorage.getItem(STORAGE_PREFIX + key);
            } catch (e) {
                return null;
            }
        },

        set(key, value) {
            try {
                localStorage.setItem(STORAGE_PREFIX + key, value);
            } catch (e) {
                // Silently fail if localStorage is not available
            }
        }
    };

    /**
     * Tab controller for a single tab group
     */
    class TabGroup {
        constructor(element) {
            this.element = element;
            this.groupId = element.dataset.tabGroup;
            this.nav = element.querySelector(SELECTORS.TABS_NAV);
            this.content = element.querySelector(SELECTORS.TABS_CONTENT);
            
            if (!this.nav || !this.content) {
                console.warn('Tabs component missing required elements', element);
                return;
            }

            this.buttons = Array.from(this.nav.querySelectorAll(SELECTORS.TAB_BUTTON));
            this.panels = Array.from(this.content.querySelectorAll(SELECTORS.TAB_PANEL));
            
            this.init();
        }

        init() {
            this.attachEventListeners();
            this.restorePreference();
        }

        attachEventListeners() {
            this.buttons.forEach(button => {
                button.addEventListener('click', () => this.handleTabClick(button));
            });
        }

        handleTabClick(clickedButton) {
            const tabId = clickedButton.dataset.tab;
            this.activateTab(tabId);
            this.savePreference(tabId);
        }

        activateTab(tabId) {
            this.deactivateAllTabs();
            this.activateButton(tabId);
            this.activatePanel(tabId);
        }

        deactivateAllTabs() {
            this.buttons.forEach(button => {
                button.classList.remove(CLASSES.ACTIVE);
            });
            this.panels.forEach(panel => {
                panel.classList.remove(CLASSES.ACTIVE);
            });
        }

        activateButton(tabId) {
            const button = this.findButtonByTabId(tabId);
            if (button) {
                button.classList.add(CLASSES.ACTIVE);
            }
        }

        activatePanel(tabId) {
            const panel = this.findPanelByTabId(tabId);
            if (panel) {
                panel.classList.add(CLASSES.ACTIVE);
            }
        }

        findButtonByTabId(tabId) {
            return this.buttons.find(button => button.dataset.tab === tabId);
        }

        findPanelByTabId(tabId) {
            return this.panels.find(panel => panel.dataset.tab === tabId);
        }

        savePreference(tabId) {
            if (this.groupId) {
                Storage.set(this.groupId, tabId);
            }
        }

        restorePreference() {
            if (!this.groupId) return;

            const savedTab = Storage.get(this.groupId);
            if (savedTab && this.findButtonByTabId(savedTab)) {
                this.activateTab(savedTab);
            }
        }
    }

    /**
     * Initialize all tab groups on the page
     */
    function initializeTabs() {
        const tabElements = document.querySelectorAll(SELECTORS.TABS_BLOCK);
        tabElements.forEach(element => new TabGroup(element));
    }

    /**
     * Bootstrap the tabs when DOM is ready
     */
    function bootstrap() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeTabs);
        } else {
            initializeTabs();
        }
    }

    bootstrap();
})();
