PKG_ID := ten31-tasks
PKG_VERSION := 0.2.0

.PHONY: all clean

all: $(PKG_ID).s9pk

$(PKG_ID).s9pk: manifest.yaml Dockerfile backend/main.py backend/requirements.txt frontend/src/App.jsx frontend/src/main.jsx startos/nginx.conf icon.png LICENSE INSTRUCTIONS.md
	start-sdk pack

clean:
	rm -f $(PKG_ID).s9pk
	docker rmi $(PKG_ID):$(PKG_VERSION) 2>/dev/null || true
