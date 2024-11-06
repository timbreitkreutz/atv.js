#!/usr/bin/env ruby
system("bin/importmap pin \"@sbrew.com/atv\"")
File.open("app/javascript/application.js", "a") do |file|
  file.puts "import { activate } from \"@sbrew.com/atv\"; activate();"
end
