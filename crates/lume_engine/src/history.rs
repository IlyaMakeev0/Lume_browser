use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;

use crate::navigation::NavigationTarget;

#[derive(Debug, Clone, Serialize)]
pub struct HistoryEntry {
    pub url: String,
    pub title: String,
    pub visit_count: u32,
    pub last_visited_ms: u128,
}

#[derive(Debug, Clone, Default)]
pub struct HistoryStore {
    entries: Vec<HistoryEntry>,
}

impl HistoryStore {
    pub fn record(&mut self, target: &NavigationTarget, title: Option<String>) {
        let resolved_title = title.unwrap_or_else(|| target.display_title.clone());

        if let Some(entry) = self
            .entries
            .iter_mut()
            .find(|entry| entry.url == target.resolved_url)
        {
            entry.title = resolved_title;
            entry.visit_count += 1;
            entry.last_visited_ms = now_ms();
            return;
        }

        self.entries.push(HistoryEntry {
            url: target.resolved_url.clone(),
            title: resolved_title,
            visit_count: 1,
            last_visited_ms: now_ms(),
        });
    }

    pub fn entries(&self) -> Vec<HistoryEntry> {
        let mut entries = self.entries.clone();
        entries.sort_by(|left, right| right.last_visited_ms.cmp(&left.last_visited_ms));
        entries
    }

    pub fn clear(&mut self) {
        self.entries.clear();
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
    use crate::navigation::resolve;

    use super::HistoryStore;

    #[test]
    fn records_repeat_visits() {
        let target = resolve("https://example.com").unwrap();
        let mut history = HistoryStore::default();

        history.record(&target, Some("Example".to_string()));
        history.record(&target, Some("Example".to_string()));

        assert_eq!(history.entries()[0].visit_count, 2);
    }
}
