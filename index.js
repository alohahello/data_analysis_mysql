const readline = require('readline'); // Importing the 'readline' module to create an interface for reading user input
const fs = require('fs'); // Importing the 'fs' module to work with the file system
const mysql = require('mysql'); // Importing the 'mysql' module for MySQL database operations

// Configuration for the MySQL database connection
const connection = mysql.createConnection({ // Creating a connection object for MySQL
  host: 'localhost', // MySQL server host
  user: 'root', // MySQL username
  password: 'yourPassword', // MySQL password
  database: 'sakila' // MySQL database name
});

// Read the data.json file
const jsonData = fs.readFileSync('data.json'); // Reading the contents of 'data.json' file synchronously
const data = JSON.parse(jsonData); // Parsing the JSON data read from the file

// Create readline interface
const rl = readline.createInterface({ // Creating a readline interface to interact with the user via command line
  input: process.stdin, // Setting input stream to standard input
  output: process.stdout // Setting output stream to standard output
});

// Function to prompt user for new or modified user information
function promptUser(callback) {
  rl.question('Enter customer ID: ', (customerId) => { // Prompting user to enter customer ID
    rl.question('Enter first name: ', (firstName) => { // Prompting user to enter first name
      rl.question('Enter last name: ', (lastName) => { // Prompting user to enter last name
        rl.question('Enter email: ', (email) => { // Prompting user to enter email
          rl.question('Enter phone number: ', (phoneNumber) => { // Prompting user to enter phone number
            callback({ customerId, firstName, lastName, email, phoneNumber }); // Passing user input as an object to the provided callback function
          });
        });
      });
    });
  });
}

// Function to update the JSON file with new or modified user information
function updateUserJson(userInfo) {
  fs.readFile('data.json', (err, data) => { // Reading the contents of 'data.json' file
    if (err) throw err; // Handling errors while reading file
    let jsonData = JSON.parse(data); // Parsing the JSON data read from the file
    // Check if user already exists
    const existingUserIndex = jsonData.accounts.findIndex(acc => acc.customerId === userInfo.customerId); // Finding the index of existing user if any
    if (existingUserIndex !== -1) { // If user exists
      // Modify existing user info
      jsonData.accounts[existingUserIndex] = userInfo; // Updating existing user information
    } else { // If user does not exist
      // Add new user info
      jsonData.accounts.push(userInfo); // Adding new user information
    }
    fs.writeFile('data.json', JSON.stringify(jsonData, null, 2), (err) => { // Writing updated user information back to 'data.json' file
      if (err) throw err; // Handling errors while writing file
      console.log('User information updated successfully!'); // Logging success message
      rl.close(); // Closing the readline interface
    });
  });
}

// Function to prompt user if they want to modify an existing customer's information
function promptModifyExisting() {
  rl.question('Do you want to modify an existing customer? (yes/no): ', (answer) => { // Prompting user if they want to modify existing customer
    if (answer.toLowerCase() === 'yes') { // If user wants to modify
      promptUser(updateUserJson); // Prompting user for new or modified user information
    } else if (answer.toLowerCase() === 'no') { // If user does not want to modify
      console.log('Exiting...'); // Logging exit message
      rl.close(); // Closing the readline interface
    } else { // If user provides invalid input
      console.log('Invalid input. Please enter either "yes" or "no".'); // Logging invalid input message
      promptModifyExisting(); // Prompting user again
    }
  });
}

// Connect to the MySQL database
connection.connect((err) => { // Attempting to establish a connection to the MySQL database
  if (err) { // Checking if there's an error while connecting
    console.error('Error connecting:', err.stack); // Logging the error if connection fails
    return;
  }
  console.log('Successfully connected to MySQL database'); // Logging successful connection message

  // Create a customers table in the database
  const createCustomersTableQuery = `
    CREATE TABLE IF NOT EXISTS customers (
      customerId INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(255),
      lastName VARCHAR(255),
      email VARCHAR(255),
      phoneNumber VARCHAR(20)
    );`;
  
  connection.query(createCustomersTableQuery, (err) => { // Executing a query to create 'customers' table
    if (err) { // Checking for errors while executing the query
      console.error('Error creating customers table:', err.stack); // Logging error if query execution fails
      return;
    }
    console.log('Customers table created successfully'); // Logging success message after table creation
    
    // Create an accounts table in the database
    const createAccountsTableQuery = `
      CREATE TABLE IF NOT EXISTS accounts (
        customerId INT UNIQUE NOT NULL,
        accountNumber VARCHAR(255) UNIQUE NOT NULL,
        balance DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (customerId) REFERENCES customers(customerId)
      );`;
    
    connection.query(createAccountsTableQuery, (err) => { // Executing a query to create 'accounts' table
      if (err) { // Checking for errors while executing the query
        console.error('Error creating accounts table:', err.stack); // Logging error if query execution fails
        return;
      }
      console.log('Accounts table created successfully'); // Logging success message after table creation
      
      // Insert data into the accounts table
      const accountsData = data.accounts.map(acc => [acc.customerId, acc.accountNumber, acc.balance]);
      const insertAccountsQuery = 'INSERT IGNORE INTO accounts (customerId, accountNumber, balance) VALUES ?';
      
      connection.query(insertAccountsQuery, [accountsData], (err, results) => { // Executing query to insert data into 'accounts' table
        if (err) { // Checking for errors while executing the query
          console.error('Error inserting accounts data:', err.stack); // Logging error if query execution fails
          return;
        }
        console.log(`Inserted ${results.affectedRows} rows into accounts table`); // Logging the number of rows inserted
        
        // Join customers and accounts and log the data
        const selectJoinedDataQuery = `
          SELECT customers.customerId, firstName, lastName, email, phoneNumber, accountNumber, balance
          FROM customers
          JOIN accounts ON customers.customerId = accounts.customerId;
        `;
        connection.query(selectJoinedDataQuery, (err, rows) => { // Executing a query to join 'customers' and 'accounts' tables
          if (err) { // Checking for errors while executing the query
            console.error('Error selecting joined data:', err.stack); // Logging error if query execution fails
            return;
          }
          console.log('Joined data retrieved from customers and accounts tables:'); // Logging success message
          console.table(rows); // Displaying joined data in a tabular format
          
          // Prompt user if they want to modify an existing customer's information
          promptModifyExisting();
        });
      });
    });
  });
});
