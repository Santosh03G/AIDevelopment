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

# Initialize Stemmer
stemmer = LancasterStemmer()

# Download tokenizer if needed
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

# Load Intents
with open("intents.json") as file:
    data = json.load(file)

# --- 1. Data Processing ---
try:
    # LOAD DATA: Must use "rb" (Read Binary)
    with open("data.pickle", "rb") as f:
        words, labels, training, output = pickle.load(f)
    print("Data loaded from pickle.")
except:
    print("Processing data from scratch...")
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

    # SAVE DATA: Must use "wb" (Write Binary)
    with open("data.pickle", "wb") as f:
        pickle.dump((words, labels, training, output), f)

# --- 2. Model Training / Loading ---
# If the model file exists, load it. Otherwise, train a new one.
if os.path.exists("chatbot_model.keras"):
    print("Loading existing model...")
    model = load_model("chatbot_model.keras")
else:
    print("Building and training new model...")
    model = Sequential()
    model.add(Dense(128, input_shape=(len(training[0]),), activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.5))
    model.add(Dense(len(output[0]), activation='softmax'))

    sgd = tf.keras.optimizers.SGD(learning_rate=0.01, momentum=0.9, nesterov=True)
    model.compile(loss='categorical_crossentropy', optimizer=sgd, metrics=['accuracy'])

    model.fit(training, output, epochs=200, batch_size=5, verbose=1)
    model.save("chatbot_model.keras")

# --- 3. Helper Functions ---
def bag_of_words(s, words):
    bag = [0 for _ in range(len(words))]
    s_words = nltk.word_tokenize(s)
    s_words = [stemmer.stem(word.lower()) for word in s_words]

    for se in s_words:
        for i, w in enumerate(words):
            if w == se:
                bag[i] = 1
    return np.array(bag)

def get_response(msg):
    """
    Returns a tuple: (text_response, image_path_or_None)
    """
    # Prepare input: Reshape to (1, len(words)) for batch processing
    input_data = np.array([bag_of_words(msg, words)])
    
    # Predict
    results = model.predict(input_data, verbose=0)
    results_index = np.argmax(results)
    tag = labels[results_index]
    
    # Threshold for confidence (0.7 = 70%)
    if results[0][results_index] > 0.7:
        for tg in data["intents"]:
            if tg['tag'] == tag:
                responses = tg['responses']
                # Check if this intent has an image associated with it
                img_path = tg.get('context_image') 
                return random.choice(responses), img_path
    
    # Fallback response (Text, None)
    return "I didn't understand that. Can you try again?", None