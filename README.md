# Galaxy Alphabet Quiz — single-file version

Everything (HTML, CSS, JavaScript, and the 50-question bank) is bundled
into one `index.html` — this is the file GitHub Pages needs.

## Publish it on GitHub Pages

1. Create a new GitHub repository (or use an existing one).
2. Upload `index.html` to the **root** of the repo.
3. Also upload the `audio` folder (with your `.mp3` recordings inside —
   see `audio/README.txt`) to the repo root, so the final structure is:
   ```
   your-repo/
   ├── index.html
   └── audio/
       ├── question01.mp3
       ├── question02.mp3
       └── ...
   ```
4. In the repo, go to **Settings → Pages**.
5. Under "Build and deployment", set **Source** to "Deploy from a
   branch", pick your default branch (e.g. `main`) and folder `/ (root)`.
6. Save. GitHub will give you a URL like
   `https://your-username.github.io/your-repo/` — that's your live quiz.
   (First deploy can take a minute or two.)

## Making edits later

Everything lives in `index.html` now:

| I want to...                         | Look for...                                        |
|----------------------------------------|-----------------------------------------------------|
| Add / remove / edit a question         | the `QUESTION_BANK` array, in the first `<script>` block |
| Change answer choices                  | the `options` array on that question, same place    |
| Change how many questions per game     | `QUESTIONS_PER_GAME` near the top of the second `<script>` block |
| Change colors / fonts / layout         | the `<style>` block near the top of the file         |
| Add or swap an audio recording         | drop the `.mp3` into `audio/` (filenames must match the `audio` path for that question) |

Just edit `index.html` directly in GitHub (or locally) and push — no
build step required.
