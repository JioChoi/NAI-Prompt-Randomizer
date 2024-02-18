# Downloading datasets
wget https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/tags.csv?download=true -O tags.csv
wget https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/key.csv?download=true -O key.csv
wget https://huggingface.co/Jio7/NAI-Prompt-Randomizer/resolve/main/pos.csv?download=true -O pos.csv

# Move to parent directory
mv tags.csv ../
mv key.csv ../
mv pos.csv ../