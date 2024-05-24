# Onchain Image Metadata Contract

This repository contains a custom metadata contract designed for the Situs Protocol's onchain accounts, including `.basin`, `.situs`, `.boulder`, among others. It is intended to enhance the metadata handling capabilities for these domains.

**Note:** This contract is also compatible with Punk Domains TLD's, although it has not yet been tested with them.

# Installation

To install the necessary dependencies, run the following command in your terminal:

```bash
npm install

## SVG Storage
The system employs a secondary Solidity file (*.sol) to store images. Specifically, it handles JPG images converted into a Base64 string. Ensure that the Base64 string is less than approximately 25kb to compile and deploy successfully.

## Animation URL
This contract utilizes the animationUrl field in conjunction with Tokenbound iframes to display the contents of each onchain account on NFT marketplaces such as OpenSea or Rarible.

## Environment Setup
Copy the .env.sample file to create a .env file.
Fill in your private information in the newly created .env file.

## Interface Modifications
You may need to modify the interface to suit the specific requirements of your deployment or to integrate additional features.

# License
This project is licensed under the GNU General Public License v3.0. Please see the LICENSE file in this repository for more information.

License
This project is licensed under the GNU General Public License v3.0. Please see the LICENSE file in this repository for more information.
