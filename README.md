# FamilyHub

Plataforma de gestão familiar com gamificação. Organize tarefas, conquistas, listas de compras, receitas e membros da família em um único lugar — com pontos, rankings e recompensas para engajar a família inteira.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| 📋 Atividades | Crie, atribua e acompanhe tarefas com prioridade e status |
| 📅 Calendário | Visualize e filtre eventos por data e membro |
| 🛒 Listas & Compras | Gerencie listas colaborativas em tempo real |
| 🍳 Receitas | Cardápio familiar com ingredientes e modo de preparo |
| 👥 Membros | Gerencie quem faz parte da família |
| 🏆 Gamificação | Pontos, conquistas, streaks e ranking entre membros |
| 🎁 Prêmios | Recompensas resgatáveis com pontos acumulados |
| 📊 Estatísticas | Gráficos de produtividade e desempenho por membro |
| 🔔 Notificações | Alertas em tempo real de conquistas e eventos |
| 📜 Histórico | Log completo de todas as alterações do sistema |

---

## Stack Técnica

**Frontend**
- HTML5 + CSS3 — JavaScript puro (sem frameworks)
- Tailwind CSS via CDN
- Lucide Icons

**Backend**
- PHP 8.1+ com PDO e prepared statements
- MySQL 8.0+

**Segurança**
- Autenticação via tokens Bearer (XSS-safe, sem cookies)
- Senhas armazenadas com bcrypt (custo 12)
- Rate limiting por IP na rota de login
- Headers de segurança via `.htaccess` (CSP, HSTS, X-Frame-Options...)
- CORS restrito ao domínio configurado no `.env`
- Nenhuma credencial no código-fonte

---

## Como Rodar Localmente

Você vai precisar de PHP 8.1+, MySQL 8.0+ e Apache com `mod_rewrite` e `mod_headers` ativos. XAMPP é uma boa opção para Windows.

**1. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/familyhub.git
cd familyhub
```

**2. Configure o `.env`**

```bash
cp .env.example .env
```

Abra o `.env` e preencha com seus dados:

```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=familyhub
DB_USER=root
DB_PASS=sua_senha_aqui
JWT_SECRET=cole_a_chave_gerada_abaixo
APP_URL=http://localhost
APP_ENV=development
RATE_LIMIT_ATTEMPTS=5
RATE_LIMIT_WINDOW=15
RATE_LIMIT_LOCKOUT=30
TRUSTED_PROXY=false
```

Para gerar o `JWT_SECRET`:

```bash
php -r "echo bin2hex(random_bytes(32));"
```

**3. Importe o banco de dados**

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS familyhub CHARACTER SET utf8mb4;"
mysql -u root -p familyhub < schema.sql
```

**4. Ative o agendador do MySQL**

Necessário para limpeza automática de tokens e logs antigos:

```bash
mysql -u root -p -e "SET GLOBAL event_scheduler = ON;"
```

**5. Acesse no navegador**

```
http://localhost/familyhub/
```

Crie sua conta pelo formulário de cadastro na tela de login.

---

## Conta de Demonstração

O `schema.sql` inclui um usuário de teste para uso local:

| Campo | Valor |
|---|---|
| E-mail | `admin@familyhub.com` |
| Senha | `123456` |

> ⚠️ Remova antes de subir para produção:
> ```sql
> DELETE FROM users WHERE email = 'admin@familyhub.com';
> ```

---

## Checklist de Produção

- [ ] `APP_ENV=production` no `.env`
- [ ] `APP_URL` apontando para o domínio real
- [ ] `JWT_SECRET` com chave forte e única
- [ ] Senha do banco de dados configurada e segura
- [ ] Usuário demo removido do banco
- [ ] HTTPS configurado (certificado SSL ativo)
- [ ] Header HSTS descomentado no `.htaccess`
- [ ] `TRUSTED_PROXY=true` apenas se usar Cloudflare ou proxy reverso

---

## Estrutura do Projeto

```
familyhub/
├── index.html           # tela de login
├── dashboard.html       # aplicação principal (SPA)
├── schema.sql           # estrutura do banco de dados
├── .env.example         # template de variáveis de ambiente
├── .htaccess            # Apache + headers de segurança
├── css/
├── js/
│   ├── app.js           # orquestrador principal
│   ├── auth.js          # sessão e cliente de API
│   ├── db.js            # estado local (localStorage)
│   ├── gamification.js  # pontos, conquistas e streaks
│   └── views/           # uma tela por arquivo
└── php/
    ├── db.php           # conexão PDO e helpers
    ├── auth.php         # login, registro e logout
    └── api.php          # rotas da API REST
```

---

MIT License
