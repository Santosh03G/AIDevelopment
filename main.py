import nltk
from nltk.stem.lancaster import LancasterStemmer
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout
import random
import json
import pickle
import os
import difflib  # <--- NEW: Import for spelling correction

stemmer = LancasterStemmer()

# Ensure tokenizer is downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Load Intents
with open("intents.json") as file:
    data = json.load(file)

# --- NEW: Build Raw Vocabulary for Spell Checker ---
# We need a list of "correct" words (unstemmed) to check against.
raw_vocabulary = []
for intent in data["intents"]:
    for pattern in intent["patterns"]:
        # Tokenize and add to list
        wrds = nltk.word_tokenize(pattern)
        raw_vocabulary.extend([w.lower() for w in wrds])
# Remove duplicates
raw_vocabulary = sorted(list(set(raw_vocabulary)))
# ---------------------------------------------------

try:
    # 1. Try to load the processed data
    with open("data.pickle", "rb") as f:
        words, labels, training, output = pickle.load(f)
    
    # 2. Load the saved model
    model = load_model("chatbot_model.keras")
    print("Data and Model loaded successfully.")

except Exception as e:
    print(f"Could not load saved data/model: {e}")
    print("Training model from scratch...")
    
    words = []
    labels = []
    docs_x = []
    docs_y = []

    for intent in data["intents"]:
        for pattern in intent["patterns"]:
            wrds = nltk.word_tokenize(pattern)
            words.extend(wrds)
            docs_x.append(wrds)
            docs_y.append(intent["tag"])

        if intent["tag"] not in labels:
            labels.append(intent["tag"])

    words = [stemmer.stem(w.lower()) for w in words if w != "?"]
    words = sorted(list(set(words)))
    labels = sorted(labels)

    training = []
    output = []
    out_empty = [0 for _ in range(len(labels))]

    for x, doc in enumerate(docs_x):
        bag = []
        wrds = [stemmer.stem(w.lower()) for w in doc]
        for w in words:
            if w in wrds:
                bag.append(1)
            else:
                bag.append(0)

        output_row = out_empty[:]
        output_row[labels.index(docs_y[x])] = 1

        training.append(bag)
        output.append(output_row)

    training = np.array(training)
    output = np.array(output)

    # Save Data
    with open("data.pickle", "wb") as f:
        pickle.dump((words, labels, training, output), f)

    # Build Model
    model = Sequential()
    model.add(Dense(128, input_shape=(len(training[0]),), activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(len(output[0]), activation='softmax'))

    sgd = tf.keras.optimizers.SGD(learning_rate=0.01, momentum=0.9, nesterov=True)
    model.compile(loss='categorical_crossentropy', optimizer=sgd, metrics=['accuracy'])

    # Train and Save Model
    model.fit(training, output, epochs=200, batch_size=5, verbose=1)
    model.save("chatbot_model.keras")

# --- Helper Functions ---

def bag_of_words(s, words):
    bag = [0 for _ in range(len(words))]
    s_words = nltk.word_tokenize(s)
    s_words = [stemmer.stem(word.lower()) for word in s_words]

    for se in s_words:
        for i, w in enumerate(words):
            if w == se:
                bag[i] = 1
    return np.array(bag)

# --- NEW: Auto-Correct Function ---
def correct_spelling(sentence):
    sentence_words = nltk.word_tokenize(sentence.lower())
    corrected_sentence = []
    
    for word in sentence_words:
        # Check if word is already correct (in raw vocab)
        if word in raw_vocabulary:
            corrected_sentence.append(word)
        else:
            # Find closest match
            # n=1 (find 1 best match), cutoff=0.75 (must be 75% similar)
            matches = difflib.get_close_matches(word, raw_vocabulary, n=1, cutoff=0.75)
            if matches:
                # Use the matched word
                corrected_sentence.append(matches[0])
            else:
                # Keep original if no match found
                corrected_sentence.append(word)
                
    return " ".join(corrected_sentence)

def get_response(msg):
    # 1. Apply Auto-Correction
    corrected_msg = correct_spelling(msg)
    print(f"Original: {msg} -> Corrected: {corrected_msg}") # Debug print
    
    # 2. Prepare input
    input_data = np.array([bag_of_words(corrected_msg, words)])
    
    # 3. Predict
    results = model.predict(input_data, verbose=0)
    results_index = np.argmax(results)
    tag = labels[results_index]
    
    # Confidence Threshold
    if results[0][results_index] > 0.7:
        for tg in data["intents"]:
            if tg['tag'] == tag:
                responses = tg['responses']
                img_path = tg.get('context_image')
                video_path = tg.get('context_video')
                suggestions = tg.get('suggestions', [])
                
                return random.choice(responses), img_path, video_path, suggestions
    
    return "I didn't understand that. Can you try again?", None, None, []