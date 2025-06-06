ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"
require "capybara/rails"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Because chrome and firefox are different
    def clean_color(button)
      button.style("background-color").values.first.sub("rgba", "rgb").sub(/, 1\)$/, ")")
    end
  end
end
