const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Dynamically import chalk (since it's ESM-only)
let chalk;
(async () => {
    chalk = await import('chalk');

    const CONFIG_PATH = path.join(__dirname, 'config.json');
    const CONFIG_EXISTS = fs.existsSync(CONFIG_PATH);

    if (!CONFIG_EXISTS) {
        console.clear();
        console.log(chalk.default.red.bold('\n🚫 Missing config.json'));
        console.log(chalk.default.yellow('Please copy ') + chalk.default.cyan('config.json.example') + chalk.default.yellow(' to ') + chalk.default.cyan('config.json'));
        console.log(chalk.default.yellow('Then edit it with your Plex & Jellyfin settings before running the tool.\n'));
        process.exit(1);
    }

    const options = [
        {
            key: '1',
            label: 'Sync watched data from Plex → Jellyfin (one-way)',
            script: 'npm run sync',
            info: 'This will NOT affect Plex or reset Jellyfin — safe to run.',
        },
        {
            key: '2',
            label: 'Reset all watched data in Jellyfin for configured users',
            script: 'npm run reset',
            warning: '⚠️ WARNING: This will PERMANENTLY reset watch history in Jellyfin.',
        },
        {
            key: '3',
            label: 'Show watched stats in Plex',
            script: 'npm run watched-plex',
        },
        {
            key: '4',
            label: 'Show watched stats in Jellyfin',
            script: 'npm run watched-fellyfin',
        },
        {
            key: '5',
            label: 'Exit',
            script: null,
        }
    ];

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const showMenu = () => {
        console.clear();
        console.log(chalk.default.cyan.bold('\n🎬 Plex ↔ Jellyfin Sync Utility'));
        console.log(chalk.default.gray('──────────────────────────────────────────\n'));

        options.forEach(opt => {
            console.log(`  ${chalk.default.yellow(opt.key)}. ${chalk.default.bold(opt.label)}`);
            if (opt.info) console.log(`     ${chalk.default.blue(opt.info)}`);
            if (opt.warning) console.log(`     ${chalk.default.red.bold(opt.warning)}`);
            console.log('');
        });

        rl.question(chalk.default.green('👉 Select an option: '), (answer) => {
            const selected = options.find(opt => opt.key === answer.trim());

            if (!selected) {
                console.log(chalk.default.red('\n❌ Invalid option. Press any key to try again.'));
                return rl.question('', () => showMenu());
            }

            if (!selected.script) {
                console.log(chalk.default.magenta('\n👋 Goodbye!\n'));
                return rl.close();
            }

            console.log(chalk.default.gray('\n──────────────────────────────────────────'));
            console.log(chalk.default.cyan(`\n▶️ Running: ${selected.label}\n`));

            const [cmd, ...args] = selected.script.split(' ');
            const child = spawn(cmd, args, { stdio: 'inherit', shell: true });

            child.on('exit', () => {
                console.log(chalk.default.gray('\n──────────────────────────────────────────'));
                console.log(chalk.default.green('\n✅ Done. Press any key to return to the menu...'));
                rl.question('', () => showMenu());
            });
        });
    };

    showMenu();
})();
