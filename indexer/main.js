#!/usr/bin/env node

const fs = require("fs");
const gray_matter = require("gray-matter");
const markdown_to_text = require("markdown-to-text");
const lunr = require("lunr");

const removeMarkdown = markdown_to_text.default;

const MD_DIR = "../docs/_posts";
const OUT_FILE = "../docs/assets/search_index.json";

function getUrl(category, file) {
  const partial = file.split("-").join("/").replace(".md", ".html");
  return "/" + (category ? category.toLowerCase() + "/" : "") + partial;
}

function getDate(dateStr) {
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return months[month] + " " + day + ", " + year;
}

console.log("Reading all markdown files from: " + MD_DIR);

fs.readdir(MD_DIR, (err, files) => {
  if (err) throw err;

  let promises = files.map((file, id) => {
    return new Promise((resolve, reject) => {
      fs.readFile(MD_DIR + "/" + file, "utf-8", (err, content) => {
        if (err) reject(err);
  
        const yaml = gray_matter(content);
        const { title, date, category } = yaml.data;
        const words = removeMarkdown(yaml.content);
        const body = words.split(/\W+/).filter(Boolean).join(" ");
  
        resolve({ id, url: getUrl(category, file), title, date: getDate(date), body });
      });
    });
  });

  Promise.all(promises).then(indices => {
    var lunr_idx = lunr(function () {
      this.ref("id");
      this.field("title");
      this.field("date");
      this.field("body");
  
      indices.forEach(function (doc) { this.add(doc); }, this);
    });
    var posts = indices.map(({ body, ...rest }) => rest);
    var data = { lunr_idx, posts };

    fs.writeFile(OUT_FILE, JSON.stringify(data, null, 2), (err) => {
      if (err) throw err;
      console.log("Successfully written search index to: " + OUT_FILE);
    });
  });
});
