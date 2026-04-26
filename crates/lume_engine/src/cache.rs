use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::network::FetchPreview;

#[derive(Debug, Clone, Serialize)]
pub struct CachedDocument {
    pub preview: FetchPreview,
    pub cached_at_ms: u128,
}

#[derive(Debug, Clone)]
pub struct MemoryCache {
    documents: HashMap<String, CachedDocument>,
    max_entries: usize,
}

impl Default for MemoryCache {
    fn default() -> Self {
        Self {
            documents: HashMap::new(),
            max_entries: 128,
        }
    }
}

impl MemoryCache {
    pub fn get(&self, url: &str) -> Option<CachedDocument> {
        self.documents.get(url).cloned()
    }

    pub fn insert(&mut self, url: String, preview: FetchPreview) {
        if self.documents.len() >= self.max_entries {
            if let Some(oldest_key) = self.oldest_key() {
                self.documents.remove(&oldest_key);
            }
        }

        self.documents.insert(
            url,
            CachedDocument {
                preview,
                cached_at_ms: now_ms(),
            },
        );
    }

    pub fn clear(&mut self) {
        self.documents.clear();
    }

    fn oldest_key(&self) -> Option<String> {
        self.documents
            .iter()
            .min_by_key(|(_, value)| value.cached_at_ms)
            .map(|(key, _)| key.clone())
    }
}

fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use crate::network::FetchPreview;

    use super::MemoryCache;

    #[test]
    fn stores_and_returns_preview() {
        let mut cache = MemoryCache::default();
        cache.insert("https://example.com".to_string(), FetchPreview::internal("lume://test".to_string()));

        assert!(cache.get("https://example.com").is_some());
    }
}
