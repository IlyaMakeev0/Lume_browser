use reqwest::header::CONTENT_TYPE;
use serde::Serialize;

use crate::{document, parser, DocumentSnapshot};

const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
     (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Lume/0.1";

#[derive(Debug, Clone)]
pub struct NetworkClient {
    client: reqwest::Client,
}

#[derive(Debug, Clone, Serialize)]
pub struct FetchPreview {
    pub url: String,
    pub status: u16,
    pub content_type: Option<String>,
    pub title: Option<String>,
    pub document: Option<DocumentSnapshot>,
    pub body_preview: String,
}

impl FetchPreview {
    pub fn internal(url: String) -> Self {
        Self {
            url,
            status: 200,
            content_type: Some("text/lume-internal".to_string()),
            title: Some("Lume Internal".to_string()),
            document: None,
            body_preview: "Internal Lume page handled by the shell.".to_string(),
        }
    }
}

impl Default for NetworkClient {
    fn default() -> Self {
        let client = reqwest::Client::builder()
            .user_agent(DEFAULT_USER_AGENT)
            .redirect(reqwest::redirect::Policy::limited(8))
            .build()
            .expect("failed to create reqwest client");

        Self { client }
    }
}

impl NetworkClient {
    pub async fn fetch_preview(&self, url: &str) -> Result<FetchPreview, String> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|error| error.to_string())?;

        let status = response.status().as_u16();
        let final_url = response.url().to_string();
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .map(ToOwned::to_owned);
        let body = response.text().await.map_err(|error| error.to_string())?;
        let document = if content_type
            .as_deref()
            .map(|value| value.contains("text/html"))
            .unwrap_or(false)
        {
            Some(document::parse_document(&final_url, &body))
        } else {
            None
        };
        let title = document
            .as_ref()
            .and_then(|snapshot| snapshot.title.clone())
            .or_else(|| parser::extract_title(&body));
        let body_preview = document
            .as_ref()
            .map(|snapshot| snapshot.text_preview.clone())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| parser::text_preview(&body, 700));

        Ok(FetchPreview {
            url: final_url,
            status,
            content_type,
            title,
            document,
            body_preview,
        })
    }
}
