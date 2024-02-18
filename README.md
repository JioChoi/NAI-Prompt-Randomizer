# Prombot

Automatic prompt generator for Novel AI image generator!

Try it out at [prombot.net](https://prombot.net/)

## Requirements
- Node.js 18 or above
- Git

## Installation Guide
**Installation**
```
git clone https://github.com/JioChoi/NAI-Prompt-Randomizer.git
cd NAI-Prompt-Randomizer
chmod +x install.sh
bash install.sh
```

**Starting Server**
```
sudo node index.js
```
**Changing the Server Address**
``cd js/script.js``

Change host to your backend server address
```
// Server HOST Address (Change this to your server address)
let host = 'https://jio7-prombot.hf.space';
let key = null;
```

## Configuration Options
![1.png](/images/EN/1.png)
**Beginning Prompt**
Prompt to put in front of generated prompt.

**Prompt Search Options**
Find random prompt that includes certain tags. Put "~" in front of a tag to exclude certain tags.

**Remove Artist**
Remove artist names from generated prompt.

**Remove Character**
Remove certain character's name and characteristics of generated prompt.

**Ending Prompt**
Prompt to put at the end of generated prompt.

![2.png](/images/EN/2.png)

**Automation Options**
* **Delay**: Delay for automatic image generation (8 seconds recommended to prevent bans).
* **Enable Automation**: Enables automatic image generation.
* **Automatically Download**: Automatically download images after generation.

![3.png](/images/EN/3.png)
**Generation History**
Click to view image generation history (disappears on page refresh).

![4.png](/images/EN/4.png)
**Prompt Information**
Hover the cursor on the image to view generated prompt informations.

## Prompt Generation
![8.png](/images/EN/8.png)
**Prombot** automatically finds a random prompt that satisfies tag requirements on **Prompt Search Options**. Then it removes duplicate tags in the random prompt. Lastly, it combines the random prompt with **Beginning Prompt** and **Ending Prompt**.

## Logic
![5.png](/images/EN/5.png)
*Image Generation Logic*

![6.png](/images/EN/6.png)
*Server Structure*

![7.png](/images/EN/7.png)
*Login Structure*

## License

This project is licensed under the MIT License.
