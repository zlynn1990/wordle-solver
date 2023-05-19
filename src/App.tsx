import './App.css';
import React, { useEffect, useRef, useState } from 'react';
import { words, seedWords, vowels } from './Words';
import { getStringFromQueryString } from './Utilities';

let context: CanvasRenderingContext2D | null;

enum LetterState {
  Excluded = 0,
  Included = 1,
  Exact = 2,
}

function App() {
  let filteredWords = [...words];
  let discoveryAttempts: number = 0;

  function reset() {
    filteredWords = [...words];
    state = [LetterState.Excluded, LetterState.Excluded, LetterState.Excluded, LetterState.Excluded, LetterState.Excluded];
    discoveryAttempts = 0;
  }

  function test() {
    for (let i = 0; i < 5; i++) {
      // Letter is in the right spot
      if (current.charAt(i) === target.charAt(i)) {
        state[i] = LetterState.Exact;
      } else {
        let letterIncluded = false;

        // Check to see if the letter is in the word
        for (let j = 0; j < 5; j++) {
          if (current.charAt(i) === target.charAt(j)) {
            state[i] = LetterState.Included;
            letterIncluded = true;
            break;
          }
        }

        // If it's not in the word set it to zero
        if (!letterIncluded) {
          state[i] = LetterState.Excluded;
        }
      }
    }
  }

  function filter() {
    for (let i = 0; i < filteredWords.length; i++) {
      // Get the current word in the filtered list
      let word: string = filteredWords[i];
      let filter: boolean = false;

      // Iterate over each of the 5 characters
      for (let n = 0; n < 5; n++) {
        // The nth letter is exact. If this word doesn't contain it there it should be filtered
        if (state[n] === LetterState.Exact) {
          if (current.charAt(n) !== word.charAt(n)) {
            filter = true;
          }
        }
        // The nth letter is excluded, filter this word if it contains the letter
        else if (state[n] === LetterState.Excluded) {
          let excludedLetter = current.charAt(n);

          for (let j = 0; j < 5; j++) {
            if (word.charAt(j) === excludedLetter) {
              filter = true;
              break;
            }
          }
          // The nth letter is included, ensure it exists within the word
        } else {
          let includedLetter = current.charAt(n);
          let included: boolean = false;

          for (let j = 0; j < 5; j++) {
            if (word.charAt(j) === includedLetter) {
              included = true;
              break;
            }
          }

          // If the letter isn't there filter it
          if (!included) {
            filter = true;
          }

          // Now ensure it doesn't exist in current location
          if (word.charAt(n) === includedLetter) {
            filter = true;
          }
        }

        // Break early if a word is already filtered
        if (filter) break;
      }

      if (filter) {
        filteredWords.splice(i--, 1);
      }
    }
  }

  // Remove bad guesses
  function prune(guess: number): string[] {
    let prunes: string[] = [];

    for (let word of filteredWords) {
      let allow: boolean = true;

      for (let i = 0; i < 5; i++) {
        const letter: string = word.charAt(i);

        // Start by removing words with repeated letters on first 2 guesses
        if (guess < 3) {
          for (let j = 0; j < 5; j++) {
            if (i === j) continue;

            if (letter === word.charAt(j)) {
              allow = false;
            }
          }
        }

        // Remove words with J,Q,Z,X on first 2 guesses
        if (guess < 3 && (letter === 'j' || letter === 'q' || letter === 'z' || letter === 'x')) {
          allow = false;
        }

        // Remove words with f,v,k,w on first guess
        if (guess === 1 && (letter === 'f' || letter === 'v' || letter === 'k' || letter === 'w')) {
          allow = false;
        }
      }

      if (allow) {
        prunes.push(word);
      }
    }

    return prunes;
  }

  function runDiscovery(): string[] {
    const excludedLetters = [];

    // Only allow letters that haven't been used
    for (let i = 0; i < 5; i++) {
      if (state[i] === LetterState.Exact || state[i] === LetterState.Included) {
        excludedLetters.push(current.charAt(i));
      }
    }

    const letterFrequency: { [key: string]: number } = {
      a: 0,
      b: 0,
      c: 0,
      d: 0,
      e: 0,
      f: 0,
      g: 0,
      h: 0,
      i: 0,
      j: 0,
      k: 0,
      l: 0,
      m: 0,
      n: 0,
      o: 0,
      p: 0,
      q: 0,
      r: 0,
      s: 0,
      t: 0,
      u: 0,
      v: 0,
      w: 0,
      x: 0,
      y: 0,
      z: 0,
    };

    // Determine the frequency of excluded letters
    for (let word of filteredWords) {
      for (let i = 0; i < 5; i++) {
        const letter = word.charAt(i);
        let excluded: boolean = false;

        for (let excludedLetter of excludedLetters) {
          if (letter === excludedLetter) {
            excluded = true;
            break;
          }
        }

        if (!excluded) {
          letterFrequency[letter]++;
        }
      }
    }

    let mostUsedLetters = [];

    // Sort letters by usage
    for (let letter in letterFrequency) {
      mostUsedLetters.push([letter, letterFrequency[letter]]);
    }

    mostUsedLetters.sort(function (a, b) {
      // @ts-ignore
      return b[1] - a[1];
    });

    const targetLetters: string[] = [];

    // Add the first 9 most frequent letters
    for (let i = 0; i < 9; i++) {
      // @ts-ignore
      if (mostUsedLetters[i][1] > 0) {
        // @ts-ignore
        targetLetters.push(mostUsedLetters[i][0]);
      }
    }

    let containsVowel: boolean = false;

    // Ensure the discovery letters contain at least 1 vowel
    for (let letter of targetLetters) {
      if (vowels.includes(letter)) {
        containsVowel = true;
        break;
      }
    }

    // Add a random vowel
    if (!containsVowel) {
      targetLetters.push(vowels[Math.floor(Math.random() * vowels.length)]);
    }

    const discoveryWords: string[] = [];

    for (let validWord of words) {
      let matches: number = 0;
      let allow: boolean = true;

      for (let i = 0; i < 5; i++) {
        const validChar = validWord.charAt(i);

        // Filter words with repeat letters
        for (let j = 0; j < 5; j++) {
          if (i === j) continue;

          if (validChar === validWord.charAt(j)) {
            allow = false;
          }
        }

        // Match any word with the used letters
        for (let j = 0; j < targetLetters.length; j++) {
          if (validChar === targetLetters[j]) {
            matches++;
            break;
          }
        }
      }

      if (matches === 5 && allow) {
        discoveryWords.push(validWord);
      }
    }

    return discoveryWords;
  }

  function solve() {
    if (context === null) return;

    context.fillStyle = 'black';
    context.fillRect(0, 0, 500, 500);

    context.font = 'bold 32px Helvetica';
    context.fillStyle = 'white';

    if (target.length !== 5) {
      context.fillText('Answer must be 5 letters!', 10, 50);
      return;
    }

    if (current.length !== 5) {
      context.fillText('Start must be 5 letters!', 10, 50);
      return;
    }

    let guesses = 1;

    while (guesses < 7) {
      test();

      let matches = 0;

      context.textAlign = 'center';

      for (let i = 0; i < 5; i++) {
        if (state[i] === LetterState.Excluded) {
          context.fillStyle = 'grey';
        } else if (state[i] === LetterState.Included) {
          context.fillStyle = 'yellow';
        } else {
          context.fillStyle = 'green';

          matches++;
        }

        context.fillText(current.charAt(i).toLocaleUpperCase(), i * 23 + 10, guesses * 45);
      }

      context.textAlign = 'left';

      // Correct word
      if (matches === 5) {
        break;
      }

      filter();

      // Prune words to undesirable guesses
      const prunes: string[] = prune(guesses);

      // Run discovery words
      const discoveryWords: string[] = runDiscovery();

      // Use discovery word if under 4 guesses and there are few matches
      if (discoveryWords.length > 0 && discoveryAttempts < 2 && guesses <= 3 && prunes.length > 3) {
        current = discoveryWords[Math.floor(Math.random() * discoveryWords.length)];

        // Register discovery has been used so we don't use it again
        discoveryAttempts++;
      } else if (prunes.length > 0) {
        current = prunes[Math.floor(Math.random() * prunes.length)];
      } else if (filteredWords.length > 0) {
        // Choose a random word from what's left
        current = filteredWords[Math.floor(Math.random() * filteredWords.length)];
      } else {
        context.fillText('N/A', 130, guesses * 30);
        break;
      }

      context.fillStyle = 'white';

      if (filteredWords.length !== prunes.length) {
        context.fillText(`${filteredWords.length.toLocaleString('en-US')}   (${prunes.length.toLocaleString('en-US')})`, 130, guesses * 45);
      } else {
        context.fillText(`${filteredWords.length.toLocaleString('en-US')}`, 130, guesses * 45);
      }

      guesses++;
    }
  }

  const outputCanvas = useRef<HTMLCanvasElement>(null);
  const [target, setTarget] = useState<string>(getStringFromQueryString('answer', 'snack'));
  const [seed, setSeed] = useState<string>(getStringFromQueryString('start', seedWords[Math.floor(Math.random() * seedWords.length)]));

  let state: number[] = [LetterState.Excluded, LetterState.Excluded, LetterState.Excluded, LetterState.Excluded, LetterState.Excluded];
  let current = seed;

  useEffect(() => {
    if (outputCanvas.current) {
      context = outputCanvas.current.getContext('2d');
      if (context) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        current = seed;
        solve();
      }
    }
  }, [outputCanvas]);

  function execute(e: any) {
    e.preventDefault();
    if (outputCanvas.current) {
      context = outputCanvas.current.getContext('2d');
      if (context) {
        reset();

        current = seed;

        solve();
      }
    }
  }

  return (
    <div className="App">
      <canvas ref={outputCanvas} width={400} height={300} />
      <form onSubmit={execute}>
        <label>
          Start: <input type="text" value={seed} onChange={(e) => setSeed(e.target.value.toLocaleLowerCase())} />
        </label>
        <br />
        <label>
          Answer: <input type="text" value={target} onChange={(e) => setTarget(e.target.value.toLocaleLowerCase())} />
        </label>
        <br />
        <br />
        <input style={{ width: 75, height: 40 }} type="submit" value="Solve" />
      </form>
    </div>
  );
}

export default App;
