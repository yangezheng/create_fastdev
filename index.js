#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, rmSync, writeFileSync, readFileSync, copyFileSync, unlinkSync } from 'fs'
import { renameSync } from 'fs'
import path from 'path'
import prompts from 'prompts'

const args = process.argv.slice(2)

if (!args[0]) {
  console.error('❌ Please provide a project name:')
  console.error('   npx create-fastdev my-app')
  process.exit(1)
}

const projectName = args[0]
const repoUrl = 'https://github.com/yangezheng/fastdev'
const tmpDir = '__fastdev_tmp__'

console.log(`🚀 Creating FastDev project: ${projectName}...`)

const response = await prompts({
  type: 'toggle',
  name: 'useSupabase',
  message: 'Use Supabase for Auth & DB?',
  initial: false,
  active: 'yes',
  inactive: 'no'
})

// Step 1: Clone template
execSync(`git clone --depth 1 ${repoUrl} ${tmpDir}`, { stdio: 'inherit' })

// Step 2: Remove .git folder
const gitDir = path.join(tmpDir, '.git')
if (existsSync(gitDir)) {
  rmSync(gitDir, { recursive: true, force: true })
}

// Step 3: Rename temp folder to target project name
renameSync(tmpDir, projectName)

// Step 4.1: Swap the App.tsx file based on user choice
if (!response.useSupabase) {
  const variantApp = path.join(projectName, 'frontend','variants','no-supabase','App.no-supabase.tsx')
  const targetApp = path.join(projectName, 'frontend', 'src', 'App.tsx')
  if (existsSync(variantApp)) {
    copyFileSync(variantApp, targetApp)
    unlinkSync(variantApp)
  }
}

// Step 4.2: Remove Supabase if user opted out
if (!response.useSupabase) {
  console.log("⚠️  Removing Supabase...")
  const frontendLib = path.join(projectName, 'frontend', 'src', 'lib', 'supabaseClient.ts')
  const envPath = path.join(projectName, 'frontend', '.env.example')

  if (existsSync(frontendLib)) {
    rmSync(frontendLib)
  }

  // Remove SUPABASE lines from .env.example
  if (existsSync(envPath)) {
    const original = readFileSync(envPath, 'utf8')
    const filtered = original
      .split('\n')
      .filter(line => !line.includes('SUPABASE'))
      .join('\n')
    writeFileSync(envPath, filtered)
  }
}

// Step 5: delete the variants folder
const variantsDir = path.join(projectName, 'frontend', 'variants')
if (existsSync(variantsDir)) {
  rmSync(variantsDir, { recursive: true, force: true })
}

// Step 6: install dependencies
console.log('📦 Installing dependencies...')
execSync('poetry install', { cwd: path.join(projectName, 'backend') })
execSync('npm install', { cwd: path.join(projectName, 'frontend') })

// Step 7: Initialize git
execSync('git init', { cwd: projectName })
execSync('git add .', { cwd: projectName })
execSync('git commit -m "🎉 initial commit from create-fastdev"', { cwd: projectName })


console.log(`✅ Project created at ./${projectName}`)

console.log(`
👉 Next steps:
  cd ${projectName}
  cp frontend/.env.example frontend/.env
  cd frontend && npm install && npm run dev
`)

process.exit(0)
