require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: %i[firefox chrome].sample, screen_size: [ 1400, 1400 ]
end
