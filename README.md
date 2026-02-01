# Gift Exchange Generator

Drawing names for the digital age!

1. Add participants' names
2. Easily and visually sort them into exclusion groups (which can be renamed by the user)
3. Generate the list
4. Email each participant their recipient

![Gift Exchange Generator Demo](/assets/Demo.gif)

Hide names with Secret Santa Mode:
![Secret Santa Mode](/assets/SecretSantaMode.png)

You can even use your email to look up who your recipient is!
![Recipient Lookup](/assets/SearchEmail.gif)

## But what's wrong with using a hat?

Because hats don't work if you're scattered across the country!

Not only that, having one person draw names on behalf of every one participating ruins the surprise of Secret Santa.

What if you get paired with your significant other? You're buying gifts for each other outside of the gift exchange; you
shouldn't be able to get each other's names!

With Secret Santa Mode, this keeps Secret Santa secret, and you can group people together so they won't draw each other'
s names!

## Quick Start

Navigate to https://giftexchangegenerator.netlify.app/ to do your own gift exchange!

## Noteworthy Features

### Conditional Rendering

Elements and layouts are displayed on the page as-needed based on what step the user has completed and whether they are
in Secret Santa Mode.

### Recursion

Generating the randomized list is done with a recursive function to account for the randomization potentially not
resulting in a viable result the first time. After 25 attempts to find a viable combination, the recursive loop is
broken and an error is sent to the user.

### Framework Free

This app was built entirely using plain ol' HTML, CSS, and JavaScript. There are no third party libraries,
pre-processors, or frameworks at play here!

### Serverless Functions

This app uses Netlify Serverless Functions to create and read data in the MongoDB Atlas cluster and send data to
Postmark for email sending.

### Error Handling

Errors are communicated to the user through a custom CSS snackbar/toast-style notification that automatically disappears
after 5 seconds. Error handling includes:

- Not letting the user progress without completing necessary steps
- Detection of duplicate names
- No possible combinations of names given the amount/groupings

![Error Message](/assets/ErrorMessage.png)

## Contributing

### Clone the repo

```bash
git clone https://github.com/arootroatch/ChristmasGiftExchange.git
cd ChristmasGiftExchange
```

### Netlify CLI

The Netlify Serverless functions for MongoDB and Postmark email will not work without a Netlify CLI local development
server and authentication to both my Netlify account and MongoDB Atlas cluster.

To install:
`npm i -g netfliy-cli`

Then: 
`netlify dev`

### Submit a pull request

If you'd like to contribute, please fork the repository and open a pull request to the 'main' branch.