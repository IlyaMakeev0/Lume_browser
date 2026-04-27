use lume_engine::{BrowserEngine, FetchPreview, HistoryEntry, NavigationTarget, NetworkProbe};

#[derive(Debug, Clone)]
pub struct NetworkFetcher {
    engine: BrowserEngine,
}

impl Default for NetworkFetcher {
    fn default() -> Self {
        Self {
            engine: BrowserEngine::default(),
        }
    }
}

impl NetworkFetcher {
    pub fn resolve_navigation(&self, input: &str) -> Result<NavigationTarget, String> {
        self.engine.resolve_allowed_navigation(input)
    }

    pub async fn fetch_text_preview(&self, url: &str) -> Result<FetchPreview, String> {
        self.engine.load_preview(url).await
    }

    pub async fn probe(&self, url: &str) -> Result<NetworkProbe, String> {
        self.engine.probe(url).await
    }

    pub fn history(&self) -> Result<Vec<HistoryEntry>, String> {
        self.engine.history()
    }

    pub fn record_navigation(&self, target: &NavigationTarget) {
        self.engine.record_navigation_visit(target);
    }

    pub fn clear_history(&self) -> Result<(), String> {
        self.engine.clear_history()
    }

    pub fn clear_cache(&self) -> Result<(), String> {
        self.engine.clear_cache()
    }
}
