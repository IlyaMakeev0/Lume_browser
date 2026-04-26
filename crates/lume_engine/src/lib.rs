pub mod cache;
pub mod document;
pub mod history;
pub mod navigation;
pub mod network;
pub mod parser;
pub mod security;

use std::sync::{Arc, Mutex};

pub use cache::{CachedDocument, MemoryCache};
pub use document::{DocumentSnapshot, LinkCandidate, ResourceCounts};
pub use history::{HistoryEntry, HistoryStore};
pub use navigation::{NavigationKind, NavigationTarget};
pub use network::{FetchPreview, NetworkClient};

#[derive(Debug, Clone)]
pub struct BrowserEngine {
    network: NetworkClient,
    history: Arc<Mutex<HistoryStore>>,
    cache: Arc<Mutex<MemoryCache>>,
}

impl Default for BrowserEngine {
    fn default() -> Self {
        Self {
            network: NetworkClient::default(),
            history: Arc::new(Mutex::new(HistoryStore::default())),
            cache: Arc::new(Mutex::new(MemoryCache::default())),
        }
    }
}

impl BrowserEngine {
    pub fn resolve_navigation(&self, input: &str) -> Result<NavigationTarget, String> {
        navigation::resolve(input)
    }

    pub fn resolve_allowed_navigation(&self, input: &str) -> Result<NavigationTarget, String> {
        let target = self.resolve_navigation(input)?;

        if target.kind != NavigationKind::Internal {
            security::ensure_allowed_navigation(&target.resolved_url)?;
        }

        Ok(target)
    }

    pub async fn load_preview(&self, input: &str) -> Result<FetchPreview, String> {
        let target = self.resolve_allowed_navigation(input)?;

        if target.kind == NavigationKind::Internal {
            let preview = FetchPreview::internal(target.resolved_url.clone());
            self.record_history(&target, preview.title.clone());
            return Ok(preview);
        }

        if let Some(cached) = self.cached_preview(&target.resolved_url) {
            self.record_history(&target, cached.preview.title.clone());
            return Ok(cached.preview);
        }

        let preview = self.network.fetch_preview(&target.resolved_url).await?;
        self.cache_preview(&target.resolved_url, &preview);
        self.record_history(&target, preview.title.clone());

        Ok(preview)
    }

    pub fn history(&self) -> Result<Vec<HistoryEntry>, String> {
        let history = self.history.lock().map_err(|error| error.to_string())?;
        Ok(history.entries())
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let mut history = self.history.lock().map_err(|error| error.to_string())?;
        history.clear();
        Ok(())
    }

    pub fn clear_cache(&self) -> Result<(), String> {
        let mut cache = self.cache.lock().map_err(|error| error.to_string())?;
        cache.clear();
        Ok(())
    }

    fn cached_preview(&self, url: &str) -> Option<CachedDocument> {
        self.cache.lock().ok()?.get(url)
    }

    fn cache_preview(&self, url: &str, preview: &FetchPreview) {
        if let Ok(mut cache) = self.cache.lock() {
            cache.insert(url.to_string(), preview.clone());
        }
    }

    fn record_history(&self, target: &NavigationTarget, title: Option<String>) {
        if let Ok(mut history) = self.history.lock() {
            history.record(target, title);
        }
    }
}
