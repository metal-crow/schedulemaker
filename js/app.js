var app = angular.module( 'sm', ['ngAnimate', 'ngSanitize'] );
//For now, not a service
app.filter('RMPUrl', function() {
	return function(input) {
		if(input && input != "TBA") {
			var nameParts = input.split(" "),
			lastName = nameParts[nameParts.length - 1];
			return '<a target="_blank" href="http://www.ratemyprofessors.com/SelectTeacher.jsp?searchName=' + lastName + '&search_submit1=Search&sid=807">' + input + '</a>';
		} else {
			return '<a href="#">' + input + '</a>';
		}
	}
});
app.filter('formatTime', function() {
	return function(minutes) {
		minutes = minutes % 1440;

		// Figure out how many hours
		var hours = Math.floor(minutes / 60);

		// Figure out how many minutes
		var remMinutes = minutes % 60;

		// Correct for AM/PM
		var ampm;
		if(hours >= 12) {
		    ampm = "pm";
		    hours -= 12
		} else {
		    ampm = "am";
		}

		// Correct for 0 hour
		if(hours == 0) {
		    hours = 12;
		}

		// Correct minutes less than 10 min
		if(remMinutes < 10) {
		    remMinutes = "0" + remMinutes;
		}
		// Put it together
		return hours + ":" + remMinutes + ampm;
	}
});

app.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    }
});

app.filter('partition', function($cacheFactory) {
	var arrayCache = $cacheFactory('partition')
	return function(arr, size) {
		var parts = [], cachedParts,
		jsonArr = JSON.stringify(arr);
		for (var i=0; i < arr.length; i += size) {
			parts.push(arr.slice(i, i + size));        
		}
		cachedParts = arrayCache.get(jsonArr); 
		if (JSON.stringify(cachedParts) === JSON.stringify(parts)) {
			return cachedParts;
		}
		arrayCache.put(jsonArr, parts);

		return parts;
	}; 
});

app.filter("parseTime", function() {
	return function(rawTime) {
		var matchedTime = rawTime.match(/([0-9]|1[0-2]):([0-9]{2})(am|pm)/);
		if(matchedTime) {
		    if(matchedTime[3] == 'am' && parseInt(matchedTime[1]) == 12) {
		        return parseInt(matchedTime[2]);
		    } else if(matchedTime[3] == 'pm') {
		    	matchedTime[1] = parseInt(matchedTime[1]) + 12;
		    }
		    return (parseInt(matchedTime[1]) * 60) + parseInt(matchedTime[2]);
		} else {
			return false;
		}
	};
});

app.filter("courseNum", function() {
	return function(course) {
		if(course) {
			return (course.department.code? course.department.code:
				course.department.number) + "-" + course.course;
		}
	};
});

app.factory("localStorage", function($window) {
	
	var localStorage = $window.localStorage;
	
	return {
		setItem: function(key, value) {
			if(localStorage) {
				if(value != null) {
					localStorage.setItem(key, angular.toJson(value));
				} else {
					localStorage.setItem(key, null);
				}
			} else {
				return false;
			}
		},
		getItem: function(key) {
			if(localStorage) {
				return angular.fromJson(localStorage.getItem(key));
			} else {
				return false;
			}
		},
		hasKey: function(key) {
			if(localStorage) {
				return localStorage.hasOwnProperty(key);
			} else {
				return false;
			}
		},
		clear: function() {
			if(localStorage) {
				return localStorage.clear();
			} else {
				return false;
			}
		},
	};
});

app.controller("AppCtrl", function($scope, localStorage, $window, $filter) {
	
	$scope.initState = function() {
		$scope.state = {};
		$scope.state.courses = [];
		$scope.state.courseMap = {};
		$scope.state.nonCourses = [];
		$scope.state.noCourses = [];
		$scope.state.schedules =[];
		$scope.state.drawOptions = {
			startTime: 480,
			endTime: 1320,
			startDay: 1,
			endDay: 6,
			bldgStyle: 'code'
		};

		$scope.state.displayOptions = {
			currentPage: 0,
			pageSize: 3,
			fullscreen: false
		};

		$scope.state.requestOptions = {
			term: +$scope.defaultTerm,
			ignoreFull: false
		};
		
		$scope.state.ui = {
			alert_betaInfo: true,
			alert_newFeatures: true,
			action_generateSchedules: false,
		};
		
		$scope.state.meta = {
			stateVersion: $scope.stateVersion,
			lastSaved: new Date().getTime()
		};
	};
	$scope.resetState = function() {
		$scope.initState();
		$window.location.reload();
	};
	
	$scope.saveState = function() {
		localStorage.setItem('state', $scope.state);
	};
	
	// Force save on close
	$window.onbeforeunload = function() {
		$scope.saveState();
	};
	
	$scope.noStateSaveOnUnload = function() {
		$window.onbeforeunload = function() {
			//No-op
		};
	};
	
	// Reload the state if it exists
	var storedState = localStorage.getItem('state');
	if(storedState != null) {
		
		// Check if state version exists or is correct
		if(storedState.hasOwnProperty('meta') && storedState.meta.stateVersion == $scope.stateVersion) {
			$scope.state = storedState;
		} else {
			
			// Before state meta
			if(confirm('We need to clear your session in order to update ScheduleMaker, is that ok? \n If you press cancel, you may run into errors.')) {
				$scope.resetState();
			} else {
				$scope.state = storedState;
			}
		}
	} else {
		
		// New session, create new state
		$scope.initState();	
	}
	
	$scope.imageSupport = true;
	
	/**
	 * Set the correct drawOptions and term as well as a global schedule var
	 * for displaying any single schedule alone
	 */
	$scope.reloadSchedule = function(schedule) {
		
		// Set a globally scoped schedule with the courses 
		if(schedule.hasOwnProperty('courses')) {
			
			$scope.schedule = schedule.courses;
		} else if(schedule.hasOwnProperty('schedule')) {
			
			$scope.schedule = schedule.schedule;
		} else {
			
			return false;
		}
		
		// Set the correct draw options
		for(var key in $scope.state.drawOptions) {
			$scope.state.drawOptions[key] = schedule[key];
		}
		
		// Set image property
		if(schedule.hasOwnProperty('image')) {
			$scope.imageSupport = schedule.image;
		} else {
			$scope.imageSupport = true;
		}
		
		// Set the correct term
		$scope.state.requestOptions.term = +schedule.term;
		
		
		// Don't save these state settings
		$scope.noStateSaveOnUnload();
	};
	
	// Check if we need to load a schedule
	if(typeof $window.reloadSchedule !== 'undefined') {
		
		// The schedule was set as a global variable
		$scope.reloadSchedule($window.reloadSchedule);
	} else if(localStorage.hasKey('reloadSchedule')){
		// Get the schedule from sessions storage
		var reloadSchedule = localStorage.getItem('reloadSchedule');
		if(reloadSchedule != null) {
			$scope.reloadSchedule(reloadSchedule);
			localStorage.setItem("reloadSchedule", null);
		}
	}
	

	var courseNumFilter = $filter('courseNum');
	
	// Course cart tools for non-generate pages.
	$scope.courseCart = {
		nextId: 0,
		init: function() {
			// Reset id if loaded from state
			if($scope.state.courses.length > 0) {
				$scope.courseCart.nextId = $scope.state.courses[$scope.state.courses.length - 1].id + 1;
			}
		},
		count: {
			all: {
				
				/**
				 * Returns the total number of selected sections in the cart
				 */
				selectedSections: function() {
					var count = 0;
					for(var i = 0; i < $scope.state.courses.length; i++) {
						if($scope.state.courses[i]) {
						count += $scope.courseCart.count.course.
							selectedSections($scope.state.courses[i]);
						}
					}
					return count;
				},
				
				/**
				 * Returns the total number of courses from the selectCoursesCtrl
				 */
				coursesFromSelect: function() {
					var count = 0;
					for(var i = 0; i < $scope.state.courses.length; i++) {
						if($scope.state.courses[i].fromSelect) {
							count++;
						}
					}
					return count;
				},
			},
			course: {
				selectedSections: function(course) {
					var count = 0;
					for(var i = 0; i < course.sections.length; i++) {
						if(course.sections[i].selected) count++;
					}
					return count;
				}
			}
		},
		selection: {
			all: {
				
				/**
				 * Unselects everything in the cart
				 */
				unselect: function() {
					for(var i = 0; i < $scope.state.courses.length; i++) {
						for(var s = 0; 
							s < $scope.state.courses[i].sections.length; s++) {
							$scope.state.courses[i].sections[s].selected = 
								false;
						}
					}
				}
			},
			section: {
				
				/**
				 * Toggle the selection status of a section, but check if its
				 * course is in the cart already, if not, add it.
				 * 
				 * @param course {Object} The course the section belongs to
				 * @param section {Object} The section to toggle
				 */
				toggleByCourse: function(course, section) {
					
					course = $scope.courseCart.ensure.course(course);
					
					if(course.selected && section.selected) {
						course.selected = false;
					}
					section.selected = !section.selected;
				},
				
				/**
				 * Toggle the selection status of a section, but check if its
				 * an orphaned section or not before doing so
				 * 
				 * @param section {Object} The section to toggle
				 */
				toggleByOrphanedSection: function(section) {
					
					section = $scope.courseCart.ensure.section(section);
					
					section.selected = !section.selected;
				},
				
				/**
				 * Toggle the selected status of a selection
				 * 
				 * Pre-condition: The section is already in the cart
				 * 
				 * @param section {Object} The section to toggle
				 */
				toggle: function(section) {
					section.selected = !section.selected;
				},
				
				/**
				 * Checks if section is selected, but first checks if course is
				 * in the cart -- if not, add it.
				 * 
				 * @param course {Object} The course the section belongs to
				 * @param section {Object} The section to toggle
				 */
				isByCourse: function(course, section) {
					return $scope.courseCart.contains.course(course) && 
						section.selected;
				}
			},
			course: {
				/**
				 * Toggles the current course's sections selcted state 
				 */
				toggle: function(course) {
					
					// If new this load or not
					var Ecourse = $scope.courseCart.ensure.course(course);

					course.selected = !$scope.courseCart.selection.course
						.toggleAllSections(Ecourse);
				},
				
				is: function(course) {
					if($scope.courseCart.contains.course(course)) {
						return $scope.courseCart.selection.course
						.allSections($scope.courseCart.ensure.course(course));
					} else {
						return false;
					}
				},
				
				/**
				 * Toggles all sections in the course
				 * 
				 * Pre-condition: the course exists in the cart
				 */
				toggleAllSections: function(course) {
					var setTo = !$scope.courseCart.selection.course
						.allSections(course);
					course.sections.forEach(function(section) {
						section.selected = setTo;
					});
					
					return setTo;
				},
				
				/**
				 * Returns true if all sections are selected
				 */
				allSections: function(course) {
					return course.sections.reduce(
						function(total, section) { 
							return total && section.selected;
					});
				},
				
				/**
				 * Unselects all sections
				 */
				unselect: function(course) {
					course.sections.forEach(function(section) {
						section.selected = false;
					});
				}
			}
		},
		
		ensure: {
			/**
			 * Ensure the provided course is in the cart
			 * 
			 *  @param course {Object} The course to ensure
			 */
			course: function(course) {
				
				var ensuredCourse = false;
				
				if($scope.state.courses.indexOf(course) == -1) {
					// The course object was not found in the cart

					if($scope.courseCart.contains.course(course)) {
						// The course object has been added previously
						
						// Find it by matching ids
						for(var i = 0; i < $scope.state.courses.length; i++) {
							if(course.id == $scope.state.courses[i].id) {
								ensuredCourse = $scope.state.courses[i];
								break;
							}
						}
						
						// The course *must* have been found and broken out
						// of the loop
						
					} else {
						// The course has never been added and is not in the
						//cart, so create a new course object
						
						ensuredCourse = $scope.courseCart.create
						.fromExistingCourse(course);
					}
				} else {
					
					// The course object is already in the cart.
					ensuredCourse = course
				}
				
				// Return the ensuredCourse
				return ensuredCourse;
			},
			
			section: function(section) {
				if($scope.courseCart.contains.section(section)) {
					
					var foundCourse = false;
					for(var i = 0; i < $scope.state.courses.length; i++) {
						if(section.courseId == $scope.state.courses[i].id) {
							foundCourse = $scope.state.courses[i];
							break;
						}
					}
					
					return $scope.courseCart.add
						.sectionToCourse(section, foundCourse);
					
				} else {
					return $scope.courseCart.create
						.fromExistingSection(section);
				}
			}
		},
		
		contains: {
			
			/**
			 * Checks if the provided course is in the cart
			 * @param course {Object} The course to check
			 * @returns {Boolean} The course is in the cart?
			 */
			course: function(course) {
				return $scope.state.courseMap.hasOwnProperty(course.id);
			},
			
			/**
			 * Checks if the provided section (with courseId) is in the cart
			 * @param section {Object} The course to check
			 * @returns {Boolean} The course is in the cart?
			 */
			section: function(section) {
				return $scope.state.courseMap.hasOwnProperty(section.courseId);
			},

		},
		remove: {
			
			/**
			 * Remove a course completely by index
			 * @param index The index to remove
			 */
			byIndex: function(index) {
				$scope.state.courses.splice(index, 1);
			}
		},
		add: {
			
			/**
			 * Adds a given section to the provided course if it's not there
			 */
			sectionToCourse: function(section, course) {
				
				var foundSection = false;
				for(var i = 0; i < course.sections.length; i++) {
					if(section.id == course.sections[i].id) {
						course.sections[i] = section;
						foundSection = true;
						break;
					}
				}
				
				if(foundSection === false) {
					course.sections.push(section);
				} 
				return section;
			},
			
			/**
			 * Add a pre-created course to the cart
			 * @param course An already formatted course ready for adding
			 * @returns {Object} The created course
			 */
			courseToCart: function(course) {
				$scope.state.courses.push(course);
				$scope.$broadcast('addedCourse');
				
				return course;
			}
		},
		create: {
			
			/**
			 * Creates and adds a new blank course and the adds it to the cart
			 * 
			 * @returns {Object} The newly created course
			 */
			blankCourse: function() {
				 return $scope.courseCart.add.courseToCart(
					 $scope.courseCart.getBlankCourse(true));
			},
			
			/**
			 * Creates and adds a pre-existing course from the database to the
			 * cart
			 * 
			 * @param course {Object} A course from the database
			 * @returns {Object} The newly created course
			 */
			fromExistingCourse: function(course) {
				var mockCourse = $scope.courseCart.getBlankCourse(false);
				
				course.fromSelect = false;
				course.search = courseNumFilter(course);
				
				$scope.state.courseMap[course.id] = true;
				return $scope.courseCart.add.courseToCart(course);
			},
			
			/**
			 * Creates and adds a pre-existing course from a schedule
			 * 
			 * @param scheduleCourse {Object} A course from the database
			 * @returns {Object} The newly created course
			 */
			fromExistingScheduleCourse: function(scheduleCourse) {
				var course = $scope.courseCart.getBlankCourse(true);
				
				course.search = scheduleCourse.courseNum;
				scheduleCourse.selected = true;
				course.sections.push(scheduleCourse);

				$scope.courseCart.add.courseToCart(course);
				
				return course;
			},
			
			/**
			 * Creates and adds a pre-existing section from the database to the
			 * cart
			 * 
			 * @param existingSection {Object} A section from the database
			 * @returns {Object} The section now added to the course
			 */
			fromExistingSection: function(section) {
				var course = $scope.courseCart.getBlankCourse(false);
				
				course.id = section.courseId;
				course.search = section.courseParentNum;
				
				course.sections.push(section);
				
				$scope.state.courseMap[course.id] = true;
				$scope.courseCart.add.courseToCart(course);
				
				return section;
			}
		},
		
		/**
		 * Returns a POJO with a correct id and other features
		 * 
		 * @param fromSelect
		 * @returns {Object} A new course
		 */
		getBlankCourse: function(fromSelect) {
			return {
				id: ++$scope.courseCart.nextId,
				search: '',
				sections: [],
				status: 'D',
				fromSelect: fromSelect
			};
		}
			
	};
	$scope.courseCart.init();
	
	$scope.generateSchedules = function() {
		$scope.state.ui.action_generateSchedules = true;
		window.location = "/generate.php";
	};
	
	$scope.ui = {
		optionLists: {
			days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
			times: {
				keys: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380, 1440],
				values: {
					'': 'Choose',
					0: '12:00am',
					60: '1:00am',
					120: '2:00am',
					180: '3:00am',
					240: '4:00am',
					300: '5:00am',
					360: '6:00am',
					420: '7:00am',
					480: '8:00am',
					540: '9:00am',
					600: '10:00am',
					660: '11:00am',
					720: '12:00pm',
					780: '1:00pm',
					840: '2:00pm',
					900: '3:00pm',
					960: '4:00pm',
					1020: '5:00pm',
					1080: '6:00pm',
					1140: '7:00pm',
					1200: '8:00pm',
					1260: '9:00pm',
					1320: '10:00pm',
					1380: '11:00pm',
					1440: '12:00am'
				}
			},
			timesHalfHours: {
				keys:[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1230, 1260, 1290, 1320, 1350, 1380, 1410, 1440],
				values: {
					0: '12:00am',
					30: '12:30am',
					60: '1:00am',
					90: '1:30am',
					120: '2:00am',
					150: '2:30am',
					180: '3:00am',
					210: '3:30am',
					240: '4:00am',
					270: '4:30am',
					300: '5:00am',
					330: '5:30am',
					360: '6:00am',
					390: '6:30am',
					420: '7:00am',
					450: '7:30am',
					480: '8:00am',
					510: '8:30am',
					540: '9:00am',
					570: '9:30am',
					600: '10:00am',
					630: '10:30am',
					660: '11:00am',
					690: '11:30am',
					720: '12:00pm',
					750: '12:30pm',
					780: '1:00pm',
					810: '1:30pm',
					840: '2:00pm',
					870: '2:30pm',
					900: '3:00pm',
					930: '3:30pm',
					960: '4:00pm',
					990: '4:30pm',
					1020: '5:00pm',
					1050: '5:30pm',
					1080: '6:00pm',
					1110: '6:30pm',
					1140: '7:00pm',
					1170: '7:30pm',
					1200: '8:00pm',
					1230: '8:30pm',
					1260: '9:00pm',
					1290: '9:30pm',
					1320: '10:00pm',
					1350: '10:30pm',
					1380: '11:00pm',
					1410: '11:30pm',
					1440: '12:00am',
				}
			}
		},
		colors:
			["#7BA270",
			 "#85B4C2",
			 "#CD9161",
			 "#74B79F",
			 "#AA9E5B",
			 "#769E9F",
			 "#9D987A",
			 "#658B76",
			 "#92838F",
			 "#A9ABC3"]
	};
});

app.controller("GenerateCtrl", function($scope, globalKbdShortcuts, $http, $filter, localStorage, uiDayFactory) {
	
	
	//Check if we are forking a schedule
	if(localStorage.hasKey('forkSchedule')){
		
		// Get the schedule from sessions storage
		var forkSchedule = localStorage.getItem('forkSchedule');
		if(forkSchedule != null) {
			
			// Clear it so we don't fork again
			localStorage.setItem('forkSchedule', null);
			
			var days = uiDayFactory();
			
			// Init state
			$scope.initState();
			
			for(var i = forkSchedule.length; i--;) {
				var course = forkSchedule[i];
				
				// If it's a real course
				if(course.courseNum != 'non') {
					$scope.courseCart.create.fromExistingScheduleCourse(course);
				} else {
					
					// Make a non-course item
					var nonCourse = {
						title: course.title,
						days: [days[parseInt(course.times[0].day)]],
						startTime: parseInt(course.times[0].start),
						endTime: parseInt(course.times[0].end)
					};
					console.log(nonCourse);
					var mergedNonCourse = false;
					
					// Try to merge this non course with other similar ones
					for(var n = 0, l = $scope.state.nonCourses.length; n < l; n++) {
						var otherNonCourse = $scope.state.nonCourses[n];
						if(otherNonCourse.title == nonCourse.title &&
						   otherNonCourse.startTime == nonCourse.startTime &&
						   otherNonCourse.endTime == nonCourse.endTime) {
							otherNonCourse.days = otherNonCourse.days.concat(nonCourse.days);
							mergedNonCourse = true;
							break;
						}
					}
					
					if(!mergedNonCourse) {
						$scope.state.nonCourses.push(nonCourse);
					}
				}
				
			}
			
		}
		
	}
	
	// Decorate some course helpers for our dynamic items directive
	$scope.courses_helpers = {
		add: $scope.courseCart.create.blankCourse,
		remove: function(index) {
			$scope.courseCart.remove.byIndex(index - 1);
			if($scope.state.courses.length == 0) {
				$scope.courses_helpers.add();
			}
		},
	};

	$scope.ensureCorrectEndDay = function() {
		if($scope.state.drawOptions.startDay > $scope.state.drawOptions.endDay) {
			$scope.state.drawOptions.endDay = $scope.state.drawOptions.startDay;
		}
	};
	$scope.ensureCorrectEndTime = function() {
		if($scope.state.drawOptions.startTime >= $scope.state.drawOptions.endTime) {
			$scope.state.drawOptions.endTime = $scope.state.drawOptions.startTime + 60;
		}
	};
	
	$scope.numberOfPages = function() {
		return Math.ceil($scope.state.schedules.length / $scope.state.displayOptions.pageSize);
	};
	
	$scope.scrollToSchedules = function() {
		
		// I know this is bad, but I'm lazy
		setTimeout(function() {
			$('input:focus').blur();
			$('html, body').animate({
		        scrollTop: $("#master_schedule_results").offset().top - 65
		    }, 500);
		}, 100);
	};
	
	$scope.generationStatus = 'D';
	
	// Overwrite app-level generateController
    $scope.generateSchedules = function() {
    	
    	$scope.generationStatus = 'L';
    	
    	var requestData = {
    		'action': 'getMatchingSchedules',
    		'term': $scope.state.requestOptions.term,
    		'courseCount': $scope.state.courses.length,
    		'nonCourseCount': $scope.state.nonCourses.length,
    		'noCourseCount': $scope.state.noCourses.length
    	};
    	
    	// Set the actual number of courses being sent
    	var actualCourseIndex = 1;
    	
    	// Loop through the course cart
    	for(var courseIndex = 0; courseIndex < $scope.state.courses.length; courseIndex++) {
    		
    		// Set up our variables
    		var course = $scope.state.courses[courseIndex];
    		var fieldName = 'courses' + (actualCourseIndex) + 'Opt[]';
    		requestData['courses' + actualCourseIndex] = course.search;
    		requestData[fieldName] = [];
    		var sectionCount = 0;
    		
    		// Add selected sections to the request
    		for(var sectionIndex = 0; sectionIndex < course.sections.length; sectionIndex++) {
    			if(course.sections[sectionIndex].selected) {
    				requestData[fieldName].push(course.sections[sectionIndex].id);
    				sectionCount++;
    			}
    		}
    		
    		// If no sections are selected, remove the course info and decrease the actual course index
    		if(sectionCount == 0) {
    			requestData.courseCount--;
    			delete requestData['courses' + actualCourseIndex];
    			delete requestData[fieldName];
    		} else {
    			actualCourseIndex++;
    		}
    		
    	}
    	
    	// Set the request data for the non courses
    	for(var nonCourseIndex = 0; nonCourseIndex < $scope.state.nonCourses.length; nonCourseIndex++) {
    		var nonCourse = $scope.state.nonCourses[nonCourseIndex];
    		var index = (nonCourseIndex + 1);
    		var fieldName = 'nonCourse';
    		requestData[fieldName + 'Title' + index] = nonCourse.title;
    		requestData[fieldName + 'StartTime' + index] = nonCourse.startTime;
    		requestData[fieldName + 'EndTime' + index] = nonCourse.endTime;
    		requestData[fieldName + 'Days' + index + '[]'] = nonCourse.days;
    	}

    	// Set the request data for the no courses stuff
    	for(var noCourseIndex = 0; noCourseIndex < $scope.state.noCourses.length; noCourseIndex++) {
    		var noCourse = $scope.state.noCourses[noCourseIndex];
    		var index = (noCourseIndex + 1);
    		var fieldName = 'noCourse';
    		requestData[fieldName + 'StartTime' + index] = noCourse.startTime
    		requestData[fieldName + 'EndTime' + index] = noCourse.endTime;
    		requestData[fieldName + 'Days' + index + '[]'] = noCourse.days;
    	}
    	
    	// Actually make the request
    	$http.post('/js/scheduleAjax.php',$.param(requestData), {
	    	requestType:'json',
	    	headers: {
	            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	        }
	    }).success(function(data, status, headers, config) {
	    	$scope.generationStatus = 'D';
	    	
	    	// If no errors happened
	    	if(!data.error && !data.errors) {
	    		
	    		// Check if any schedules were generated
		    	if(data.schedules == undefined || data.schedules == null || data.schedules.length == 0) {
		    		$scope.resultError = 'There are no matching schedules!';
		    	} else {
		    		
		    		// Otherwise reset page, scroll to schedules and clear errors
			    	$scope.state.displayOptions.currentPage = 0;
			    	$scope.scrollToSchedules();
			    	$scope.state.schedules = data.schedules;
			    	$scope.resultError =  '';
		    	}

	    	} else if(!data.error && data.errors) {
	    		
	    		// Display errors
	    		$scope.resultError = data.errors.reduce(function(totals, error){return totals + ', ' + error.msg;}, '');
	    		console.log("Schedule Generation Errors:", data);
	    	} else {
	    		
	    		// Display errors
	    		$scope.resultError = data.msg;
	    		console.log("Schedule Generation Error:", data);
	    	}
	    }).
	    error(function(data, status, headers, config) {
	    	$scope.generationStatus = 'D';
	    	// Display errors
	    	$scope.resultError =  'Fatal Error: An internal server error occurred';
	    	console.log("Fatal Schedule Generation Error:", data);
	    });
    };
    
    // Bind keyboard shortcuts
    globalKbdShortcuts.bindCtrlEnter($scope.generateSchedules);
    
    // Bind arrow key pagination
    globalKbdShortcuts.bindPagination(function() {
    	if (this.keyCode == 39 && $scope.state.displayOptions.currentPage + 1 < $scope.numberOfPages()) {
    		$scope.state.displayOptions.currentPage++;
    		$scope.scrollToSchedules();
    	} else if(this.keyCode == 37 && $scope.state.displayOptions.currentPage - 1 >= 0) {
    		$scope.state.displayOptions.currentPage--;
    		$scope.scrollToSchedules();
    	}
    });
    
    // If the previous page set to generate schedules
    if($scope.state.ui.action_generateSchedules) {
    	$scope.state.ui.action_generateSchedules = false;
    	$scope.generateSchedules();
    }
 
});
app.controller( "MainMenuCtrl", function( $scope) {
	$scope.path = window.location.pathname;
});

app.controller( "scheduleCoursesCtrl", function( $scope, $http, $q, $timeout) {

	// Check if a course needs to be added
	if($scope.state.courses.length == 0 || $scope.courseCart.count.all.coursesFromSelect() == 0) {
		$scope.courses_helpers.add();  
	}
	
	// Create a way to cancel repeated searches
	var canceler = {};
	$scope.search = function(course) {
		
		// Check if the course id already has an ajax request and end it.
		if (canceler.hasOwnProperty(course.id)) {
			canceler[course.id].resolve();
		}
		
		// Create a new request
		canceler[course.id] = $q.defer();
		
		// Set the course to loading status
		course.status = 'L';
		
		// Create the new search request
		var searchRequest = $http.post('/js/scheduleAjax.php', $.param({
			'action'     : 'getCourseOpts',
			'course'     : course.search,
			'term'       : $scope.state.requestOptions.term,
			'ignoreFull' : $scope.state.requestOptions.ignoreFull
		}), {
			requestType:'json',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
			}, 
			// Here is where the request gets canceled from above
			timeout: canceler[course.id].promise
		}).success(function(data, status, headers, config) {
			
			// Set loading status to done
			course.status = 'D';
			
			// If there has been no error
			if(!data.error) {
				
				//set isError and selected to their defaults
				for(var c = 0; c < data.length; ++c) {
					data[c].isError = false;
					data[c].selected = true;
				}
				
				// Set the data to course's sections
				course.sections = data;
			} else {
				
				// Make a faux-result with isError being true
				course.sections = [{isError: true, error: data}];
			}
		}).
		error(function(data, status, headers, config) {
			// Most likely typed too fast, ignore and set status to done.
			course.status = 'D';
		});
	};
	
	// Listen for changes in request options
	$scope.$watch('state.requestOptions', function(newRO, oldRO) {
		if(angular.equals(newRO, oldRO)) {
			return;
		}
		for(var i = 0, l = $scope.state.courses.length; i < l; i++) {
			var course = $scope.state.courses[i];
			
			// Only re-search if the search field was valid anyways
			if(course.search.length > 3) {
				$scope.search(course);
			}
		}
	}, true);
	
	// Reset the page size if the new size leaves the current page out of range
	$scope.$watch('state.displayOptions.pageSize', function(newPS, oldPS) {
		if(newPS === oldPS) {
			return;
		}
		if($scope.state.displayOptions.currentPage + 1 > $scope.numberOfPages()) {
			$scope.state.displayOptions.currentPage = $scope.numberOfPages() - 1;
		}
	});
	
	// Watch for changes in the course cart
	$scope.$watch('state.courses', function(newCourses, oldCourses) {
		for(var i = 0, l = newCourses.length; i < l; i++){
			var newCourse = newCourses[i],
			
			// find the old course that the new one came from
			oldCourse = oldCourses.filter(function (filterCourse) {
				return filterCourse.id === newCourse.id;
			})[0];
			
			// It's a new course, so mock an old one for comparisons sake
			if(typeof oldCourse === 'undefined') {
				oldCourse = {
					search: '',
					sections: []
				};
			}
			
			// Check to see if the search field changed, or was valid
			if(newCourse.search != oldCourse.search && newCourse.search.length > 3) {
				
				// Find the new results!
				$scope.search(newCourse);
			} else if(newCourse.search != oldCourse.search) {
				
				// The search field has been changed to be too short, remove sections
				newCourse.sections = [];
				if (canceler.hasOwnProperty(newCourse.id)) {
					canceler[newCourse.id].resolve();
					newCourse.status = 'D';
				}
			}
		}
	}, true);
});

app.controller('nonCourseItemsCtrl', function($scope) {
	
	$scope.addNonC = function() {
		$scope.state.nonCourses.push({
			title: '',
			startTime: '',
			endTime: '',
			days: []
		});
	};
	
	$scope.removeNonC = function(index) {
		$scope.state.nonCourses.splice(index, 1);
	};
	
	$scope.ensureCorrectEndTime = function(index) {
		if($scope.state.nonCourses[index].startTime >= $scope.state.nonCourses[index].endTime) {
			$scope.state.nonCourses[index].endTime = $scope.state.nonCourses[index].startTime + 60;
		}
	};
});

app.controller('noCourseItemsCtrl', function($scope) {
	
	$scope.addNoC = function() {
		$scope.state.noCourses.push({
			startTime: '',
			endTime: '',
			days: []
		});
	};
	
	$scope.removeNoC = function(index) {
		$scope.state.noCourses.splice(index, 1);
	};
	
	$scope.ensureCorrectEndTime = function(index) {
		if($scope.state.noCourses[index].startTime >= $scope.state.noCourses[index].endTime) {
			$scope.state.noCourses[index].endTime = $scope.state.noCourses[index].startTime + 60;
		}
	};
});


app.directive('professorLookup', function($http) {
	return {
		restrict: 'A',
		scope: {
			professorLookup:'='
		},
		template: '{{professorLookup}}',
		link: {
			pre: function(scope, elm, attrs) {
				
			},
			post: function(scope, elm, attrs) {
				if(scope.professorLookup != '' && scope.professorLookup != 'TBA') {
					scope.stats = 'none';
					elm.on('click', function() {
						var nameParts = scope.professorLookup.split(" "),
						lastName = nameParts[nameParts.length - 1];
						if(scope.stats == 'none') {
							$http({
								method:'GET',
								url:'js/rmp.php?professor='+lastName,
								headers: {
									'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
								}, 
								withCredentials: true
							}).success(function(data, status, headers, config) {
								var parser = new DOMParser();
								var doc = parser.parseFromString(data,"text/html");
								var entry = doc.querySelectorAll('#ratingTable .entry')[0];
								var getStat = function(selector) {
									return entry.querySelectorAll(selector)[0].innerHTML;
								};
								var getUrl = function() {
									return 'http://www.ratemyprofessors.com/ShowRatings.jsp?tid=' + entry.querySelectorAll('.profName a')[0].href.split('?tid=')[1];
								};
								var ratingColor = function(score) {
									score = parseFloat(score);
									if(score >= 4) {
										return '#18BC9C';
									} else if(score >= 3) {
										return '#F39C12';
									} else {
										return '#E74C3C';
									}
								}
								scope.stats = {
									name: getStat('.profName a'),
									url: getUrl(),
									dept: getStat('.profDept'),
									numRatings: getStat('.profRatings'),
									rating: getStat('.profAvg'),
									easiness: getStat('.profEasy'),
								};
								elm.popover({
									html:true,
									trigger:'manual',
									placement:'auto left',
									title: '<a target="_blank" href="'+scope.stats.url+'">'+scope.stats.name+' - '+scope.stats.dept+'</a>',
									content: '<div class="row"><div class="col-xs-6 rmp-rating"><h2 style="background-color:'+ratingColor(scope.stats.rating)+'">'+scope.stats.rating+'</h2>Average Rating</div><div class="col-xs-6 rmp-rating"><h2 style="background-color:'+ratingColor(scope.stats.easiness)+'">'+scope.stats.easiness+'</h2>Easiness</div></div><div style="text-align:center">Based on '+scope.stats.numRatings+' ratings<br><a target="_blank" href="http://www.ratemyprofessors.com/SelectTeacher.jsp?searchName='+lastName+'&search_submit1=Search&sid=807">Not the right professor?</a><br><small>&copy; 2013 <a target="_blank" href="http://www.ratemyprofessors.com">RateMyProfessors.com</a></small></div>'
								});
								elm.popover('show');
								
						    });
						} else {
							elm.popover('toggle');
						}
					});
				}
			}
		}
	};
});

app.factory('uiDayFactory', function() {
	var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	
	return function() {
		return days;
	};
});
app.directive("courseCart", function() {
	return {
		restrict: 'A',
		templateUrl: '/js/templates/cart.html'
	};
});
app.directive("dowSelectFields", function(uiDayFactory) {
	return {
		restrict: 'A',
		scope: {
			select: '=dowSelectFields'
		},
		template: '<div class="btn-group btn-group-dow"><button type="button" ng-repeat="day in days" ng-click="toggle(day)" class="btn btn-default btn-dow" ng-class="{\'btn-success\':isSelected(day)}" ng-bind="day.substring(0 ,2)"></button></div>',
		link: {
			pre: function(scope) {
				scope.days = uiDayFactory();
				scope.isSelected = function(day) {
					return scope.select.indexOf(day) != -1;
				};
				scope.toggle = function(day) {
					var index = scope.select.indexOf(day);
					if(index == -1) {
						scope.select.push(day);
					} else {
						scope.select.splice(index, 1);
					}
				};
			}
		}
	};
});

app.directive("loadingButton", function(uiDayFactory) {
	
	var template = '<i class="fa fa-spin fa-refresh" ></i> ';
	
	return {
		restrict: 'A',
		scope: {
			status: '=loadingButton',
			text: '@loadingText'
		},
		link: function(scope, elm) {
			var prevHTML = elm.html();
			scope.$watch('status', function(newLoading, prevLoading) {
				if(newLoading != prevLoading) {
					if(newLoading == 'L') {
						elm.html(template + scope.text);
						elm.attr("disabled", true);
					} else {
						elm.html(prevHTML);
						elm.attr("disabled", false);
					}
				}
			});
		}
	};
});

app.directive("scheduleCourse", function(){
	  return {
	    restrict: "C",
	    templateUrl: './js/templates/courseselect.html',
	  };
});
app.directive("dynamicItems", function($compile,$timeout, globalKbdShortcuts){
	  return {
	    restrict: "A",
	    scope: {
	    	'dynamicItems': '=',
	    	'useClass':'@',
	    	'helpers':'=',
	    	'colors': '='
	    },
	    controller: function($scope) {
	    	this.items = $scope.dynamicItems;
	    	this.add = $scope.helpers.add;
	    	this.remove = $scope.helpers.remove;
	    },
	    compile: function(telm, tattrs) {
	    	return {
	    		pre: function(scope, elm, attrs) {
                    scope.$parent.$on('addedCourse',function() {
                        $timeout(function() {
                            elm.find('input.searchField:last').focus();
                        }, 0, false);
                    });
		    		elm.append($compile('<div class="'+scope.useClass+' repeat-item" ng-repeat="item in dynamicItems" dynamic-item ng-if="item.fromSelect"></div>')(scope));
	    		},
	    		post: function(scope, elm, attrs) {
	    			globalKbdShortcuts.bindSelectCourses(function() {
	    				if(elm.find("input.searchField:focus").length == 0) {
	            			$('html, body').animate({
	            		        scrollTop:0
	            		    }, 500, null, function() {
	            		    	elm.find('input.searchField:first').focus();
	            		    });
	    				}
	    			
	    			});
	    		}
	    	};
	    }
	  };
});

app.directive("dynamicItem", function($timeout){
  return {
    restrict: "A",
    require: '^dynamicItems',
    link: { pre: function(scope, elm, attrs, dynamicItems) {
    		scope.$watch('$index', function(newVal) {
    			scope.index =  newVal + 1;
    	        if(scope.index == 1) {   
    	            $timeout(function() {
    	            	elm.addClass('no-repeat-item-animation');
    	                elm.find("input.searchField").focus();
    	            }, 0, false);
    	        }
    		});
	    	
	        scope.remove = function() {
            	if(scope.index == 1 && dynamicItems.items.length == 1) {
            		elm.removeClass('no-repeat-item-animation');
            	}
            	dynamicItems.remove(scope.index);
	        };
    	}, post: function(scope, elm, attrs, dynamicItems) {
	        var ident = 'input.searchField',
	        input = elm.find(ident);
	        var doKeystrokeAnalysis = function(e) {
	        	kbdResult = true;
	            if(e.keyCode == 13 && !e.ctrlKey) {
	                if(dynamicItems.items.length == scope.index) {
	                	dynamicItems.add();
                        $timeout(function() {
                            elm.next().find(ident).focus();
                        }, 0, false);
	                } else {
	                    elm.next().find(ident).focus();
	                }
	            } else if(e.keyCode == 27) {
	                e.preventDefault();
	                if(scope.index > 1) {
                    	elm.prev().find(ident).focus();
	                } else {
	                	var parent = elm.parent();
	                	$timeout(function() {
	                		parent.find(ident+":first").focus();
                        }, 0, false);
	                }
                    scope.remove();  
	            } else if(e.keyCode == 38 && e.ctrlKey && !e.altKey) {
	                e.preventDefault();
	                if(scope.index > 1) {
                    	elm.prev().find(ident).focus();
	                } 
	            } else if(e.keyCode == 40 && e.ctrlKey &&! e.altKey) {
	                if(scope.index < dynamicItems.items.length) {
                    	elm.next().find(ident).focus();
                    	e.preventDefault();
	                } 
	            } else if(e.keyCode == 38 && e.ctrlKey && e.altKey) {
	            	scope.showResults = false;
	            	kbdResult = false;
	            } else if(e.keyCode == 40 && e.ctrlKey && e.altKey) {
	                scope.showResults = !scope.showResults;
	                kbdResult = false;
	            } else if (e.ctrlKey && e.altKey && e.keyCode > 48 && e.keyCode < 57) {
	            	if(scope.item.sections.length > 0) {
		            	var index = e.keyCode - 49;
		            	var resultElm = scope.item.sections[index];
		            	if(resultElm) {
		            		scope.item.sections[index].selected = !scope.item.sections[index].selected;
		            	}
	            	}
	            } else if (e.ctrlKey && e.altKey && e.keyCode == 65) {
	            	if(scope.item.sections.length > 0) {
	            		var total = 0;
	            		for(var i = 0; i < scope.item.sections.length; i++) {
	            			if(scope.item.sections[i].selected) {
	            				total++;
	            			}
	            		}
	            		if(total == scope.item.sections.length) {
	            			var target = false;
	            		} else {
	            			var target = true;
	            		}
	            		for(var i = 0; i < scope.item.sections.length; i++) {
	            			scope.item.sections[i].selected = target;
	            		}
	            	}
	            }
	        };
	        
            input.blur(function(e) {
                e.preventDefault();
            });
            
	        input.keydown(function(e) {
	        	scope.$apply(doKeystrokeAnalysis(e));
	        	return kbdResult;
	        });
            $timeout(function() {
                elm.find("input.searchField").focus();
            }, 0, false);
    	}
    }
  };
});

app.directive('paginationControls', function() {
	return {
		restrict: 'A',
		scope: {
			displayOptions: '=paginationControls',
			totalLength: '=paginationLength',
			paginationCallback: '&'
		},
		template: '<button title="Shortcut: Ctrl + Left" class="btn btn-default" ng-disabled="displayOptions.currentPage == 0" ng-click="displayOptions.currentPage=displayOptions.currentPage-1">Previous</button>' +
				  ' {{displayOptions.currentPage+1}}/{{numberOfPages()}} ' +
		          '<button title="Shortcut: Ctrl + Right" class="btn btn-default" ng-disabled="displayOptions.currentPage >= totalLength/displayOptions.pageSize - 1" ng-click="displayOptions.currentPage=displayOptions.currentPage+1">Next</button>',
		link: {
			pre: function(scope) {
				scope.numberOfPages = function() {
					return Math.ceil(scope.totalLength / scope.displayOptions.pageSize);
				};
			},
			post: function(scope, elm, attrs) {
				if(scope.paginationCallback) {
					elm.find('button').click(function() {
						scope.paginationCallback();
					});
				}
			}
		}
	};
});

app.directive('pinned', function() {
	return {
		restrict: 'A',
		link: function(scope, elm, attrs) {
			
			var $window = $(window),
			sizer = elm.parent().parent().find(".pinned-sizer"),
			$footer = $("#footer"),
			fO, sO;
			var updateHeight = function() {
				fO = $window.height() - $footer.offset().top - $footer.outerHeight();
				sO = sizer.height();
				elm.css('height', (fO > 0)?(sO - fO):(sO));
			};
			
			setTimeout(function() {
				updateHeight();
				$(window).on("resize", updateHeight);
			}, 100);

			elm.addClass("pinned");
		}
	};
});

app.factory('openPopup', function($window) {
	
	/**
	 * A utility to get top/left with a given width and height
	 */
	var getPosition = function(width, height) {
		
		// Set defaults if either not set
		if(!width || !height) {
			width = 550;
			height = 450;
		}
		
		// Return an object and calculate correct position
		return {
			width:  width,
			height: height,
			top:    Math.round((screen.height / 2) - (height / 2)),
			left:   Math.round((screen.width / 2) - (width / 2))
		};
	};
	
	return function(width, height) {
		
		var settings = ['about:blank'];
		
		if(width !== true) {
			var pos = getPosition(width, height);
			settings.push('Loading...');
			settings.push('left=' + pos.left + 
			',top=' + pos.top + 
			',width=' + pos.width +
			',height=' + pos.height + 
			',personalbar=0,toolbar=0,scrollbars=1,resizable=1');
		} else {
			settings.push('_blank');
		}
		
		return $window.open.apply($window, settings);
	}
});

app.factory('shareServiceInfo', function() {
	
	// Define the services and their common functions
	return {
		googlep: function(url) {
			return 'https://plus.google.com/share?url=' + encodeURIComponent(url);
		},
		twitter: function(url) {
				return 'http://twitter.com/share?url=' + encodeURIComponent(url) + '&text=My%20Class%20Schedule';
		},
		facebook: function(url) {
			return 'http://www.facebook.com/sharer.php?u=' + encodeURIComponent(url);
		}
	}
});

/**
 * Several endpoint abstractions for the schedules
 */
app.directive('scheduleActions', function($http, $q, shareServiceInfo, openPopup, localStorage) {
	
	var serializer = new XMLSerializer();
	
	function scheduleActions(scope, elm) {
		
		var getSavedInfo = function() {

			// See if we already have saved info
			if(scope.saveInfo) {
				var defferred = $q.defer();
				defferred.resolve(scope.saveInfo);
				return defferred.promise;
			}
			// If not create it
			var schedule = angular.copy(scope.schedule);
			
			
			// Create the request params as all strings with correct keys
			var params = {
				data: JSON.stringify({
					startday:  '' + scope.state.drawOptions.startDay,
					endday:    '' + scope.state.drawOptions.endDay,
					starttime: '' + scope.state.drawOptions.startTime,
					endtime:   '' + scope.state.drawOptions.endTime,
					building:  '' + scope.state.drawOptions.bldgStyle,
					term:      '' + scope.state.requestOptions.term,
					schedule:  schedule,
				}),
				svg: serializer.serializeToString(elm.find("svg").get(0)),
				action: "saveSchedule"
			};
			
			
			// Post the schedule and return a promise
			return $http.post('/js/scheduleAjax.php', $.param(params), {
				requestType:'json',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}, 
				withCredentials: true
			}).then(function(request) {
				if(request.status == 200 && typeof request.data.error == 'undefined') {
					
					// save the saveInfo and return it
					scope.saveInfo = request.data;
					
					return request.data;
				} else {
					
					return $q.reject("Save Error:" + request.data.msg);
				}
			});
		};

		scope.scheduleActions = {
			
			save: function(saveType) {
				
				if(saveType == "create") {
					getSavedInfo().then(function(data) {
						scope.notification = "This schedule can be accessed at " +
						"<a href=\""+ data.url + "\" target=\"_blank\">"
						+ data.url + "</a><br><em>This schedule will be removed" +
						" after 3 months of inactivity</em>";
					},  function(error) {
						console.log(error);
						scope.notification = error;
					});
				} else {
					
					localStorage.setItem('forkSchedule', scope.schedule);
					
					window.location = "/generate.php";
				}
			},
			
			shareToService: function($event, serviceName, newWindow) {
				
				$event.preventDefault();
				scope.status = "L";
				if(serviceName && serviceName in shareServiceInfo) {
					
					var service = shareServiceInfo[serviceName];
					
					// Create a popup in click context to workaround blockers
					var popup = openPopup(newWindow);
					
					getSavedInfo().then(function(data) {
						scope.status = "D";
						popup.location = service(data.url);
					});
				} 
			},
			
			shareToEmail: function($event) {
				
				$event.preventDefault();
				
				getSavedInfo().then(function(data) {
					
					var body = "Check out my schedule at: " + data.url;
					
					//Open a mailto link
					window.location.href= "mailto:?body=" + 
					encodeURIComponent(body);
				});
			},
			
			shareToDirectLink: function($event) {
				
				$event.preventDefault();
				
				scope.scheduleActions.save('create');
			},
			
			downloadiCal: function($event) {
				
				$event.preventDefault();
				
				getSavedInfo().then(function(data) {

					window.location.href= data.url + "/ical";
				});
			},
			
			downloadImage: function($event) {
				
				$event.preventDefault();
				
				var popup = openPopup(true);
				
				getSavedInfo().then(function(data) {

					popup.location = ("http://" + window.location.hostname +
					'/img/schedules/' + parseInt(data.id, 16) + '.png');
				});
			},
			
			print: function() {
				
				
				var reloadSchedule = angular.copy(scope.state.drawOptions);
				reloadSchedule.term = scope.state.requestOptions.term,
				reloadSchedule.courses = scope.schedule;
				
				var popup = openPopup(780, 600);
				
				popup.localStorage.setItem('reloadSchedule', angular.toJson(reloadSchedule));
				popup.document.title = "My Schedule";
				popup.location = "http://" + window.location.hostname + '/schedule/render/print';	
			}
		}
	};
	
	
	return {
		
		/**
		 * Save a schedule, given the respective parameters
		 */
		link: {
			pre: scheduleActions
		}
	};
});

app.directive('schedule', function($timeout, $filter) {
	function Schedule(scope) {
		this.scope = scope;
		this.drawOptions = {
			parsedTime: {}
		};
		this.courseDrawIndex = 0;
	}
	Schedule.prototype.init = function() {
		
		this.drawOptions.parsedTime.start = parseInt(this.scope.state.drawOptions.startTime);
		this.drawOptions.parsedTime.end = parseInt(this.scope.state.drawOptions.endTime);
		if(!this.drawOptions.parsedTime.start || !this.drawOptions.parsedTime.end) return false;
        
		this.scope.hiddenCourses = [];
		this.scope.onlineCourses = [];
		this.scope.scheduleItems = [];
		
		return true;
	};
	Schedule.prototype.drawGrid = function() {
		
		var hourArray = [];
        for(var time = this.drawOptions.parsedTime.start; time < this.drawOptions.parsedTime.end; time += 60) {
    		// Calculate the label
    		var hourLabel = Math.floor(time / 60);
    		if(hourLabel > 12) { hourLabel -= 12; }
    		else if(hourLabel == 0) { hourLabel = 12; }

    		if(time >= 720) { ap = " PM"; } else { ap = " AM"; }	
    		
    		hourArray.push(String(hourLabel) + ap);
    	}

		// Generate grid
        var numDays = this.scope.state.drawOptions.endDay - this.scope.state.drawOptions.startDay + 1;
		// Set up grid
		var rawHeight = (hourArray.length * 40),
		globalOpts = {
			height: rawHeight + 25,
			hoursWidth: 5
		},
		rawDayWidth = 100 / numDays,
		dayPadding = 1,
		dayOpts = {
			num: numDays,
			rawWidth: rawDayWidth,
			width: (rawDayWidth - (globalOpts.hoursWidth / numDays) - (2 * dayPadding)) + '%',
			padding: dayPadding,
			height: rawHeight
		};
		
		var dayArray = [];
		//Generate days
		
		var dayIndex = this.scope.state.drawOptions.startDay;
		for(var i=0; i < numDays; i++) {
			var offset = globalOpts.hoursWidth + ( 2 * dayOpts.padding) + ((dayOpts.rawWidth - dayOpts.padding) * i);
			dayArray.push({
				name: this.scope.ui.optionLists.days[dayIndex],
				offset: offset + '%',
			});
			dayIndex++;
		}
		
        
		//Set the this.scope variable
		this.scope.grid = {
			hours: hourArray,
			days: dayArray,
			opts: {
				height: globalOpts.height,
				hoursWidth: globalOpts.hoursWidth,
				daysWidth: dayOpts.width,
				daysHeight: dayOpts.height,
				pixelAlignment:''
			}
		};
		return true;
	};
	
	Schedule.prototype.drawCourse = function(course, index) {
		var grid = this.scope.grid;
		var startTime = this.drawOptions.parsedTime.start;
		var endTime = this.drawOptions.parsedTime.end;
		
		// Using the old logic here because it works just as good as anything
		
		for(var t = 0; t < course.times.length; t++) {
			// Make it easier for the developer
			var time = course.times[t];
			// Skip times that aren't part of the displayed days
			if(time.day < this.scope.state.drawOptions.startDay || time.day > this.scope.state.drawOptions.endDay) {
				if(this.scope.hiddenCourses.indexOf(course) == -1) {
					this.scope.hiddenCourses.push(course);
				}
				continue;
			}
			
			var courseStart = time.start,
			courseEnd = time.end,
			shorten = 0;

			// Skip times that aren't part of the displayed hours
			if(courseStart < startTime || courseStart > endTime || courseEnd > endTime) {
				// Shorten up the boxes of times that extend into
				// the visible spectrum
				if(courseStart < startTime && courseEnd > startTime) {
					courseStart = startTime;
					shorten = -1;
				} else if(courseEnd > endTime && courseStart < endTime) {
					courseEnd = endTime;
					shorten = 1;
				} else {
					// The course is completely hidden
					if(this.scope.hiddenCourses.indexOf(course) == -1) {
						this.scope.hiddenCourses.push(course);
					}
					continue;
				}
			}
			
			// Calculate the height
			var timeHeight = parseInt(courseEnd) - parseInt(courseStart);
			timeHeight = timeHeight / 30;
			timeHeight = Math.ceil(timeHeight);
			timeHeight = (timeHeight * 20);

			// Calculate the top offset
			var timeTop = parseInt(courseStart) - startTime;
			timeTop = timeTop / 30;
			timeTop = Math.floor(timeTop);
			timeTop = timeTop * 20;
			timeTop += 19;					// Offset for the header
			
			if(course.courseNum != 'non') {
				var location = ((this.scope.state.drawOptions.bldgStyle == 'code') ? time.bldg.code : time.bldg.number) + "-" + time.room,
				instructor = course.instructor,
				courseNum = course.courseNum;
			} else {
				var location = '',
				instructor = '',
				courseNum = '';
			}
			this.scope.scheduleItems.push({
				title:course.title,
				content: {
				    location: location ,
				    courseNum: courseNum,
				    instructor: instructor
				},
				boundry: {
					x: grid.days[time.day - this.scope.state.drawOptions.startDay].offset,
					y: timeTop,
					shorten: shorten,
					width: grid.opts.daysWidth,
					height:timeHeight
				},
				color: this.scope.ui.colors[course.courseIndex?(course.courseIndex - 1):this.courseDrawIndex % 10]
			});
			
		}
	};
	
	Schedule.prototype.drawCourses = function() {
		this.courseDrawIndex = 0;
		for(var coursesIndex = 0, coursesLength = this.scope.schedule.length; coursesIndex < coursesLength; coursesIndex++) {
			var course = this.scope.schedule[coursesIndex];
			this.courseDrawIndex++;
			if(course.online) {
				this.scope.onlineCourses.push(course);
			} else if(course.times != undefined) {
				this.drawCourse(course);
			}
		}
	};
	
	Schedule.prototype.draw = function() {
		this.drawGrid()
		this.drawCourses();
	};

	return {
		restrict: 'A',
		templateUrl: '/js/templates/schedule.html',
		link: {
			pre: function(scope, elm, attrs) {
				scope.scheduleController = new Schedule(scope);
				scope.itemEnter = function($event) {
					$target = $($event.target);
					$scope = $target.scope();
					if($scope.item.boundry.height < 70) {
						$scope.item.boundry.orig_height = $scope.item.boundry.height;
						$scope.item.boundry.height = 70;
					}
				};
				scope.itemLeave = function($event) {
					$target = $($event.target);
					$scope = $target.scope();
					if($scope.item.boundry.orig_height) {
						$scope.item.boundry.height = $scope.item.boundry.orig_height;
					}
				};
				
				if(typeof attrs.existing === "undefined") {
					scope.saveAction = "create";
				} else {
					scope.saveAction = "fork";
				}
				
				if(typeof attrs.print === "undefined") {
					scope.print = false;
				} else {
					scope.print = true;
				}
				
			},
			post: function(scope, elm) {
				scope.$watchCollection('state.drawOptions', function() {	
					if(scope.scheduleController.init()) {
						// Only redraw if valid options
						scope.scheduleController.draw();
					
						
						// Fix the pixel issues after DOM updates (not on Chrome)
						if(typeof window.chrome == 'undefined') {
							$timeout(function() {
								var offset = elm.find("svg").offset(),
								vert = 1 - parseFloat('0.'+('' + offset.top).split('.')[1]);
								horz = 1 - parseFloat('0.'+('' + offset.left).split('.')[1]);
								scope.grid.opts.pixelAlignment ='translate('+horz+','+vert+')';
							},10,true);
						}
					}
				});
			}
		}
	};
});

app.directive('svgTextLine', function() {
	return {
		link: function(scope, elm, attrs) {
			var text = attrs.svgTextLine;
			var adjust = (scope.print)? 1: 0;
			var cutoff = 25 + (adjust * -7);
			if(scope.grid.days.length > 3) {
				if(text.length > 14) {
					element = elm.get(0);
					element.setAttribute("textLength", (parseFloat(scope.grid.opts.daysWidth) + 1 - adjust )+ "%");
					element.setAttribute("lengthAdjust", "spacingAndGlyphs");
				}
				if(text.length > cutoff) {
					text = text.slice(0, cutoff - 3) + '...';
				}
			}
			elm.text(text);
		}
	};
});

app.controller("scheduleCtrl", function($scope, $location) {
	
	var id = window.location.pathname.split('/');
	id = id[id.length - 1];
	$scope.saveInfo = {
		url: $location.absUrl(),
		id: id
	};
	
	$scope.noStateSaveOnUnload();
	
});


app.controller("printScheduleCtrl", function($scope, $location, localStorage) {
	
	if($scope.schedule) {	
		var pTerm ='' + $scope.state.requestOptions.term;
		
		var year = parseInt(pTerm.substring(0,4));
        var term = pTerm.substring(4);
        if(year >= 2013) {
            switch(term) {
                case '1': term = "Fall"; break;
                case '3': term = "Winter Intersession"; break;
                case '5': term = "Spring"; break;
                case '8': term = "Summer"; break;
                default:  term = "Unknown";
            }
        } else {
            switch(term) {
                case '1': term = "Fall"; break;
                case '2': term = "Winter"; break;
                case '3': term = "Spring"; break;
                case '4': term = "Summer"; break;
                default:  term = "Unknown";
            }
        }
        
        $scope.heading = "My " + year + "-" + (year+1) + " " + term  + " Schedule";
        
        $scope.printTheme = 'woc';
        
        $scope.printThemeOptions = [{
        	value: 'woc',
        	label: "Modern Colors"
        }, {
        	value: 'bow',
        	label: "Classic B&W"
        }, {
        	value: 'gow',
        	label: "Classic Greyscale"
        }, {
        	value: 'boc',
        	label: "Black Text & Colors"
        }];
	}
	
	$scope.noStateSaveOnUnload();
	localStorage.setItem("reloadSchedule", null);
	
	$scope.print = window.print.bind(window);
});


app.factory('globalKbdShortcuts', function($rootScope) {
	var globalKbdShortcuts = {
		'bindCtrlEnter': function(callback) {
			Mousetrap.bind('mod+enter', function(e) {
			    $rootScope.$apply(callback);
			    return true;
			});
			
			// Only allow to bind once, so mock function after first use
			this.bindCtrlEnter = function() {};
		},
		'bindPagination': function(callback) {
			Mousetrap.bind('mod+right', function(e) {
			    $rootScope.$apply(callback.apply(e));
			    return true;
			});
			Mousetrap.bind('mod+left', function(e) {
			    $rootScope.$apply(callback.apply(e));
			    return true;
			});
			
			// Only allow to bind once, so mock function after first use
			this.bindPagination = function() {};
		},
		'bindSelectCourses': function(callback) {
			Mousetrap.bind('mod+down', function(e) {
			    callback();
			    return false;
			});
			
			// Only allow to bind once, so mock function after first use
			this.bindSelectCourses = function() {};
		},
	};
	return globalKbdShortcuts;
});


app.filter('parseSectionTimes', function($filter) {
	var translateDay = $filter('translateDay');
	return function(times, byLocation) {
		if(typeof times != 'object') return times;
		var parsedTimes = [];
		for(var e = 0; e < times.length; ++e) {
            // Search the existing list of times to see if a match exists
            var found = false;
            var time = times[e];
            
            if(byLocation && typeof time.bldg != "undefined") {
        		time.location =  time.bldg.code
                + "(" + time.bldg.number + ")"
                + "-" + time.room;
        	} else {
        		time.location = false;
        	}
            
            for(var f = 0; f < parsedTimes.length; ++f) {
                if(parsedTimes[f].start == time.start && parsedTimes[f].end == time.end && parsedTimes[f].location == time.location) {
                    found = f;
                }
            }

            // If a match was found, add the day to it, otherwise add a new time
            if(found !== false) {
            	parsedTimes[found].days += ", " + translateDay(time.day);
            } else {
            	parsedTimes.push({
                    start: time.start,
                    end:   time.end,
                    days:  translateDay(time.day),
                    location: time.location
                });
            }
        }
		return parsedTimes;
	};
});

app.filter('translateDay', function() {
	return function(day) {
    // Modulo it to make sure we get the correct days
    day = day % 7;

    // Now switch on the different days
    switch(day) {
        case 0:
            return "Sun";
        case 1:
            return "Mon";
        case 2:
            return "Tue";
        case 3:
            return "Wed";
        case 4:
            return "Thu";
        case 5:
            return "Fri";
        case 6:
            return "Sat";
        default:
            return null;
    }
}
});

app.filter('cartFilter', function() {
	return function(input) {
		var parsed = [];
		var SSFN = this.courseCart.count.course.selectedSections;
		angular.forEach(input, function(course) {
			if(course && course.sections.length > 0 && !course.sections[0].isError && SSFN(course) > 0) {
				parsed.push(course);
			}
		});		
		return parsed;
	};
});


// BROWSE PAGE
app.controller("BrowseCtrl", function($scope, entityDataRequest) {
	
	$scope.schools = [];
	
	$scope.$watch('state.requestOptions.term', function(newTerm) {
		entityDataRequest.getSchoolsForTerm({term: newTerm}).success(function(data, status) {
			if(status == 200 && typeof data.error == 'undefined') {
				$scope.schools = data;
			} else if(data.error) {
				// TODO: Better error checking
				alert(data.msg);
			}
		});
	});
});


app.directive('browseList', function($http, entityDataRequest) {
	var hierarchy = ['school', 'department', 'course', 'section'];
	var capitalize = function(string) {
		return string.charAt(0).toUpperCase() + string.slice(1);
	};
	
	return {
		restrict: 'A',
		link: {
			pre: function(scope, elm, attrs) {
				var hIndex = hierarchy.indexOf(attrs.browseList);
				if(hIndex == -1) {
					throw "browseList mode does not exist";
					return;
				}
				var itemName = hierarchy[hIndex],
				childrenName = hierarchy[hIndex + 1] + 's',
				entityDataRequestMethodName = 'get' + capitalize(childrenName) + 'For' + capitalize(itemName);
				scope[itemName][childrenName] = [];
				scope[itemName].ui = {
					expanded: false,
					buttonClass: 'fa-plus',
					toggleDisplay: function() {
						
						scope[itemName].ui.expanded = !scope[itemName].ui.expanded;
						
						if(scope[itemName].ui.expanded && scope[itemName][childrenName].length == 0) {
							scope[itemName].ui.loading = true;
							scope[itemName].ui.buttonClass = 'fa-refresh fa-spin';
							if(itemName == "course") {
								if(scope.courseCart.contains.course(scope.course)) {
									var sections = [];
									for(var i = 0; i < scope.state.courses.length; i++) {
										if(scope.course.id == scope.state.courses[i].id) {
											sections = scope.state.courses[i].sections;
											break;
										}
									}
									if(sections.length > 0) {
										scope.course.sections = sections;
										scope[itemName].ui.buttonClass = 'fa-minus';
										return;
									}
								}
							}
							entityDataRequest[entityDataRequestMethodName]({term: scope.state.requestOptions.term, param: scope[itemName].id}).success(function(data, status) {
								if(status == 200 && typeof data.error == 'undefined') {
									if(data[childrenName].length > 0) {
										scope[itemName][childrenName] = data[childrenName];
									} else {
										scope[itemName].ui.noResults = true;
									}
								} else if(data.error) {
									// TODO: Better error checking
									alert(data.msg);
								}
								scope[itemName].ui.buttonClass = 'fa-minus';
							});
						} else if(scope[itemName].ui.expanded) {
							scope[itemName].ui.buttonClass = 'fa-minus';
						} else {
							scope[itemName].ui.buttonClass = 'fa-plus';
						}
					}
				};
			}
		}
	};
});

		
app.factory('entityDataRequest', function($http) {
	var entityDataRequest = function(params, callback) {
		return $http.post('js/entityAjax.php', $.param(params), {
			requestType:'json',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}, 
			withCredentials: true
		});
	};
	return {
		getSchoolsForTerm: function(opts) {
			return entityDataRequest({
				action:'getSchoolsForTerm',
				term: opts.term
			});
		},
		getDepartmentsForSchool: function(opts) {
			return entityDataRequest({
				action:'getDepartments',
				term: opts.term,
				school: opts.param
			});
		},
		getCoursesForDepartment: function(opts) {
			return entityDataRequest({
				action:'getCourses',
				term: opts.term,
				department: opts.param
			});
		},
		getSectionsForCourse: function(opts) {
			return entityDataRequest({
				action:'getSections',
				course: opts.param
			});
		}
	};
});

/**
 * Return either the code or number if it set
 */
app.filter('codeOrNumber', function() {
	return function(input) {
		return (!!input.code)? input.code: input.number;
	};
});

// SEARCH PAGE

/**
 * The controller holding all the logic for the search page
 */
app.controller('SearchCtrl', function($scope, $http, entityDataRequest, globalKbdShortcuts) {
	
	var defaultOptions = {
		college: {id: "any", code: "any", number: null, title: "Any College"},
		department: {id: "any", code: "any", number: null, title: "Any Department"}
	};
	
	$scope.searchResults = [];
	
	$scope.search =  {
		params: {
			action: 'find'
		},
		options: {
			colleges: [defaultOptions.college],
			departments: [defaultOptions.department]
		}
	};
	
	// Init the search parmeters without changing their object identity
	($scope.initSearch = function() {
			var sP = $scope.search.params;
			sP.term = $scope.state.requestOptions.term;
			sP.college = "any";
			sP.department = "any";
			sP.level = "any";
			sP.credits = "";
			sP.professor = "";
			sP.daysAny = true;
			sP.days = [];
			sP.timesAny = true;
			sP.times = {
				'morn': false,
				'aftn': false,
				'even': false
			};
			sP.online = true;
			sP.honors = true;
			sP.offCampus = true;
			
			sP.title = "";
			sP.description = "";
	})();
	
	
	// Listen for term changes
	$scope.$watch('state.requestOptions.term', function (newTerm) {
		
		
		// Set the new term in our params
		$scope.search.params.term = newTerm;
		
		// Reset our selected options
		$scope.search.params.college = "any";
		$scope.search.params.department = "any";
		
		// Get a list of schools for the term
		entityDataRequest.getSchoolsForTerm({term: newTerm})
		.success(function(data, status) {
			if(status == 200 && typeof data.error == 'undefined') {
				
				// Push the default to the top and set it as the option list
				data.unshift(defaultOptions.college);
				$scope.search.options.colleges = data;
			} else if(data.error) {
				
				// TODO: Better error checking
				alert(data.msg);
			}
		});
	});
	
	// Reload the departments when a college is selected
	$scope.$watch('search.params.college', function(newCollege) {
		
		if(newCollege != "" && newCollege !="any") {
			
			// Reset selected department
			$scope.search.params.department = "any";
			
			// Get a list of departments
			entityDataRequest.getDepartmentsForSchool({
				term: $scope.search.params.term, 
				param: newCollege
			}).success(function(data, status) {
				
				if(status == 200 && typeof data.error == 'undefined') {
					
					// Push the default to the top and set it as the option list
					data.departments.unshift(defaultOptions.department);
					$scope.search.options.departments = data.departments;
				} else if(data.error) {
					
					// TODO: Better error checking
					alert(data.msg);
				}
			});
		} else if ($scope.search.options.departments.length > 1) {
			
			// Reset if there were more than one options already out
			$scope.search.options.departments = [defaultOptions.department];
		}
	});
	
	// 'D'one loading
	$scope.searchStatus = "D";
	
	$scope.findMatches = function() {
		
		// Only search if a current search is not in progress 
		if($scope.searchStatus == "L") return;
		
		
		// 'L'oading
		$scope.searchStatus = "L";
		
		var params = angular.copy($scope.search.params);
	
		// Remove uneeded data
		if(params.timesAny == true) {
			delete params['times'];
		} else {
			var times = [];
			for(var time in params.times) {
				if(params.times[time] == true) {
					times.push(time);
				}
			}
			
			if(times.length == 0) {
				delete params['times'];
			} else {
				params.times = times;
			}
		}
		delete params['timesAny'];
		
		if(params.daysAny == true || params.days.length == 0) {
			delete params['days'];
		}
		delete params['daysAny'];
		
		
		$http.post('js/searchAjax.php', $.param(params), {
			requestType:'json',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			}, 
			withCredentials: true
		}).success(function(data, status) {
			
			
			// 'D'one loading
			$scope.searchStatus = "D";
			
			if(status == 200 && typeof data.error == 'undefined') {
				
				// Set the results
				$scope.searchResults = data;
				
				// Reset to the first page and scroll
				$scope.searchPagination.currentPage = 0;
				$scope.scrollToResults();
				
				// Remove any errors if they were present
				if($scope.resultError) {
					$scope.resultError = null;
				}
			} else if(data.error) {
				
				$scope.resultError = data.msg;
				
				// Clear result
				$scope.searchResults = [];
			}
		});
	};
	
	$scope.searchPagination = {
		pageSize: 10,
		currentPage: 0
	};
	
	$scope.numberOfPages = function() {
		return Math.ceil($scope.searchResults.length / $scope.searchPagination.pageSize);
	};
	
	$scope.scrollToResults = function() {
		
		// Again, I know this is bad, but I'm lazy
		setTimeout(function() {
			$('input:focus').blur();
			$('html, body').animate({
		        scrollTop: $("#search_results").offset().top - 65
		    }, 500);
		}, 100);
	};
	
	globalKbdShortcuts.bindCtrlEnter($scope.findMatches);
    globalKbdShortcuts.bindPagination(function() {
    	if (this.keyCode == 39 && $scope.searchPagination.currentPage + 1 < $scope.numberOfPages()) {
    		$scope.searchPagination.currentPage++;
    		$scope.scrollToResults();
    	} else if(this.keyCode == 37 && $scope.searchPagination.currentPage - 1 >= 0) {
    		$scope.searchPagination.currentPage--;
    		$scope.scrollToResults();
    	}
    });
});
