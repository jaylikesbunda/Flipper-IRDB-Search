# Flipper Zero IR Remote Search

This project provides a web-based search tool for the Flipper Zero IR Database. It allows users to easily search, filter, and download IR remote files for use with the Flipper Zero device.

## Live Demo

You can access the live version of this tool at: [https://jaylikesbunda.github.io/Flipper-IRDB-Search/](https://jaylikesbunda.github.io/Flipper-IRDB-Search/)

## Features

- Search IR remote files by brand, model, or device type
- Filter results by device type and brand
- Responsive design for desktop and mobile devices
- Pagination for large result sets
- Direct download links for IR files
- Dark theme with orange accents for a sleek look

## Components

1. **Python Parser Script**: Downloads and parses the Flipper-IRDB repository to create a JSON database.
2. **Web Application**: A client-side web tool for searching and displaying the IR remote database.

## Local Setup

### Prerequisites

- Python 3.6+
- Web browser (Chrome, Firefox, Safari, etc.)
- Internet connection (for initial setup and database updates)

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/flipper-zero-ir-search.git
   cd flipper-zero-ir-search
   ```
2. Install required Python packages:
   ```
   pip install requests
   ```
3. Run the Python parser script to create the database:
   ```
   python flipper_irdb_parser.py
   ```
   This will download the Flipper-IRDB repository, parse the IR files, and create a `flipper_irdb_database.json` file.
4. Open `index.html` in your web browser to use the search tool locally.

## Usage

1. Visit [https://jaylikesbunda.github.io/Flipper-IRDB-Search/](https://jaylikesbunda.github.io/Flipper-IRDB-Search/) or open `index.html` in your web browser if running locally.
2. Use the search bar to find IR remotes by brand, model, or device type.
3. Use the dropdown filters to narrow results by device type or brand.
4. Click the "Download IR File" link on any result to download the IR file for use with your Flipper Zero.

## Updating the Database

To update the IR remote database with the latest files from the Flipper-IRDB repository:

1. Run the Python parser script again:
   ```
   python flipper_irdb_parser.py
   ```
2. Refresh the web page to load the updated database.

## Contributing

Contributions to improve the search tool or parser script are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Commit your changes (`git commit -am 'Add some feature'`)
5. Push to the branch (`git push origin feature/your-feature-name`)
6. Create a new Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Flipper-IRDB](https://github.com/logickworkshop/Flipper-IRDB) for providing the IR remote database
- All contributors to the Flipper-IRDB project

## Disclaimer

This project is not officially associated with Flipper Devices Inc. It is a community-driven tool to facilitate easier searching and access to the Flipper-IRDB repository.
