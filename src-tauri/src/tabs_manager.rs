use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserTab {
    pub id: String,
    pub title: String,
    pub url: String,
    pub is_active: bool,
    pub pinned: bool,
    pub space: String,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct NewTabRequest {
    pub title: Option<String>,
    pub url: Option<String>,
    pub space: Option<String>,
    pub activate: Option<bool>,
}

#[derive(Debug)]
pub struct TabsManager {
    tabs: Vec<BrowserTab>,
    next_id: u64,
}

impl Default for TabsManager {
    fn default() -> Self {
        Self::with_home_tab()
    }
}

impl TabsManager {
    pub fn with_home_tab() -> Self {
        let mut manager = Self {
            tabs: Vec::new(),
            next_id: 1,
        };

        manager.create_tab(NewTabRequest {
            title: Some("Lume Start".to_string()),
            url: Some("lume://start".to_string()),
            space: Some("Focus".to_string()),
            activate: Some(true),
        });

        manager
    }

    pub fn list(&self) -> Vec<BrowserTab> {
        self.tabs.clone()
    }

    pub fn create_tab(&mut self, request: NewTabRequest) -> BrowserTab {
        let should_activate = request.activate.unwrap_or(true);

        if should_activate {
            self.deactivate_all();
        }

        let id = format!("tab-{}", self.next_id);
        self.next_id += 1;

        let tab = BrowserTab {
            id,
            title: request.title.unwrap_or_else(|| "New Tab".to_string()),
            url: request.url.unwrap_or_else(|| "about:blank".to_string()),
            is_active: should_activate || self.tabs.is_empty(),
            pinned: false,
            space: request.space.unwrap_or_else(|| "Focus".to_string()),
        };

        self.tabs.push(tab.clone());
        tab
    }

    pub fn activate_tab(&mut self, id: &str) -> Option<BrowserTab> {
        let selected_index = self.tabs.iter().position(|tab| tab.id == id)?;

        for tab in &mut self.tabs {
            tab.is_active = false;
        }

        self.tabs[selected_index].is_active = true;
        Some(self.tabs[selected_index].clone())
    }

    pub fn navigate_active_tab(&mut self, title: String, url: String) -> BrowserTab {
        if self.tabs.is_empty() {
            return self.create_tab(NewTabRequest {
                title: Some(title),
                url: Some(url),
                space: Some("Focus".to_string()),
                activate: Some(true),
            });
        }

        let active_index = self
            .tabs
            .iter()
            .position(|tab| tab.is_active)
            .unwrap_or(0);

        for tab in &mut self.tabs {
            tab.is_active = false;
        }

        let active_tab = &mut self.tabs[active_index];
        active_tab.title = title;
        active_tab.url = url;
        active_tab.is_active = true;
        active_tab.clone()
    }

    pub fn close_tab(&mut self, id: &str) -> Result<(), String> {
        let closing_tab = self
            .tabs
            .iter()
            .find(|tab| tab.id == id)
            .cloned()
            .ok_or_else(|| format!("Tab '{id}' was not found."))?;

        self.tabs.retain(|tab| tab.id != id);

        if self.tabs.is_empty() {
            self.create_tab(NewTabRequest::default());
            return Ok(());
        }

        if closing_tab.is_active {
            if let Some(tab) = self.tabs.first_mut() {
                tab.is_active = true;
            }
        }

        Ok(())
    }

    fn deactivate_all(&mut self) {
        for tab in &mut self.tabs {
            tab.is_active = false;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{NewTabRequest, TabsManager};

    #[test]
    fn creating_active_tab_deactivates_previous_tab() {
        let mut manager = TabsManager::with_home_tab();
        let first_tab_id = manager.list()[0].id.clone();

        let second_tab = manager.create_tab(NewTabRequest {
            title: Some("Docs".to_string()),
            url: Some("https://tauri.app".to_string()),
            space: None,
            activate: Some(true),
        });

        let tabs = manager.list();

        assert!(tabs.iter().any(|tab| tab.id == second_tab.id && tab.is_active));
        assert!(tabs.iter().any(|tab| tab.id == first_tab_id && !tab.is_active));
    }

    #[test]
    fn closing_the_active_tab_activates_another_tab() {
        let mut manager = TabsManager::with_home_tab();
        let second_tab = manager.create_tab(NewTabRequest::default());

        manager.close_tab(&second_tab.id).unwrap();

        assert_eq!(manager.list().len(), 1);
        assert!(manager.list()[0].is_active);
    }

    #[test]
    fn activating_unknown_tab_keeps_current_state() {
        let mut manager = TabsManager::with_home_tab();
        let before = manager.list();

        assert!(manager.activate_tab("missing-tab").is_none());
        assert_eq!(manager.list()[0].id, before[0].id);
        assert!(manager.list()[0].is_active);
    }

    #[test]
    fn navigating_active_tab_updates_url_and_title() {
        let mut manager = TabsManager::with_home_tab();
        let tab = manager.navigate_active_tab("Example".to_string(), "https://example.com".to_string());

        assert_eq!(tab.title, "Example");
        assert_eq!(tab.url, "https://example.com");
        assert!(tab.is_active);
    }
}
