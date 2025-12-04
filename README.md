# AuraCore MCP Server

**Project & Context Management for Claude Desktop**

AuraCore est un serveur MCP (Model Context Protocol) qui permet à Claude de gérer des projets, stocker du contexte métier, suivre des tâches, et maintenir une mémoire de session persistante.

## 🎯 Fonctionnalités

- **Gestion de Projets** - Créer, lister, mettre à jour des projets
- **Contexte Métier** - Stocker règles business, patterns, conventions
- **Gestion de Tâches** - Créer des tâches avec dépendances et priorités
- **Mémoire de Session** - Remember/Recall/Forget avec TTL optionnel
- **Journal de Décisions** - Logger les décisions avec raisonnement

## 📋 Prérequis

- Node.js >= 18.0.0
- npm ou yarn
- Windows 10/11 (testé), Linux, macOS

## 🚀 Installation

### 1. Cloner le repository

```bash
git clone https://github.com/AuraStackAI-Agency/MCP_AuraCore_Code.git
cd MCP_AuraCore_Code
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Compiler le TypeScript

```bash
npm run build
```

### 4. Configurer Claude Desktop

Ajouter dans votre fichier de configuration Claude Desktop :

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "auracore": {
      "command": "node",
      "args": ["C:/chemin/vers/MCP_AuraCore_Code/dist/index.js"]
    }
  }
}
```

**Linux/macOS** (`~/.config/Claude/claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "auracore": {
      "command": "node",
      "args": ["/chemin/vers/MCP_AuraCore_Code/dist/index.js"]
    }
  }
}
```

**Important** : Remplacez le chemin par le chemin réel vers votre installation.

### 5. Redémarrer Claude Desktop

Fermez et relancez Claude Desktop pour que le MCP soit chargé.

## 🛠️ Outils Disponibles

### Projets

| Outil | Description |
|-------|-------------|
| `auracore_create_project` | Créer un nouveau projet |
| `auracore_list_projects` | Lister les projets (filtrable par statut) |
| `auracore_get_project` | Obtenir les détails d'un projet |
| `auracore_update_project` | Mettre à jour un projet |

### Contexte

| Outil | Description |
|-------|-------------|
| `auracore_store_context` | Stocker une règle/pattern/convention |
| `auracore_query_context` | Rechercher du contexte |
| `auracore_delete_context` | Supprimer un contexte |

### Tâches

| Outil | Description |
|-------|-------------|
| `auracore_create_task` | Créer une tâche |
| `auracore_update_task` | Mettre à jour une tâche |
| `auracore_get_next_tasks` | Obtenir les prochaines tâches recommandées |

### Mémoire

| Outil | Description |
|-------|-------------|
| `auracore_remember` | Stocker une valeur (avec TTL optionnel) |
| `auracore_recall` | Récupérer une valeur |
| `auracore_forget` | Supprimer une valeur |

### Décisions

| Outil | Description |
|-------|-------------|
| `auracore_log_decision` | Logger une décision avec raisonnement |
| `auracore_get_decisions` | Historique des décisions |

## 📁 Structure du Projet

```
MCP_AuraCore_Code/
├── src/
│   ├── index.ts      # Point d'entrée, définition des tools MCP
│   ├── database.ts   # Couche base de données (sql.js/SQLite)
│   ├── tools.ts      # Implémentation des outils
│   └── types.ts      # Définitions TypeScript
├── dist/             # Code compilé (généré)
├── package.json
├── tsconfig.json
└── README.md
```

## 💾 Stockage des Données

La base de données SQLite est stockée dans :
- **Windows** : `%USERPROFILE%\.auracore\auracore.db`
- **Linux/macOS** : `~/.auracore/auracore.db`

## 🔧 Développement

### Mode développement (avec ts-node)

```bash
npm run dev
```

### Rebuild après modifications

```bash
npm run build
```

## 📝 Exemples d'utilisation

Une fois configuré, vous pouvez demander à Claude :

```
"Crée un projet AuraCore pour mon nouveau site web"
"Stocke cette convention : les noms de variables en camelCase"
"Crée une tâche pour implémenter l'authentification"
"Quelles sont les prochaines tâches à faire sur mon projet?"
"Remember que le endpoint API est /api/v1"
"Recall le endpoint API"
```

## ⚠️ Notes Techniques

- Utilise `sql.js` (SQLite compilé en WebAssembly) pour la compatibilité cross-platform
- Base de données persistée sur disque après chaque modification
- Compatible avec le protocole MCP via stdio

## 📄 Licence

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une PR.
